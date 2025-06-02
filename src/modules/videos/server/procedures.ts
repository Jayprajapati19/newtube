import { db } from "@/db";
import { z } from "zod"
import { users, videoReactions, videos, videoUpdateSchema, videoViews } from "@/db/schema";
import { mux } from "@/lib/mux";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, eq, getTableColumns, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { UTApi } from "uploadthing/server";
import { workflow } from "@/lib/workflow";

export const videosRouter = createTRPCRouter({

    getOne: baseProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ input, ctx }) => {

            const { clerkUserId } = ctx;

            let userId;

            const [user] = await db
                .select()
                .from(users)
                .where(inArray(users.clerkId, clerkUserId ? [clerkUserId] : []))

            if (user) {
                userId = user.id;
            }

            const viewerReactions = db.$with("viewer_reactions").as(
                db
                    .select({
                        videoId: videoReactions.videoId,
                        type: videoReactions.type,
                    })
                    .from(videoReactions)
                    .where(inArray(videoReactions.userId, userId ? [userId] : []))
            );

            const [existingVideo] = await db
                .with(viewerReactions)
                .select({
                    ...getTableColumns(videos),
                    user: {
                        ...getTableColumns(users),
                    },
                    viewCount: db.$count(videoViews, eq(videoViews.videoId, videos.id)),
                    likeCount: db.$count(
                        videoReactions,
                        and(
                            eq(videoReactions.videoId, videos.id),
                            eq(videoReactions.type, "like")
                        ),
                    ),
                    dislikeCount: db.$count(
                        videoReactions,
                        and(
                            eq(videoReactions.videoId, videos.id),
                            eq(videoReactions.type, "dislike")
                        )
                    ),
                    viewerReaction: viewerReactions.type,
                })
                .from(videos)
                .innerJoin(users, eq(videos.userId, users.id))
                .leftJoin(viewerReactions, eq(viewerReactions.videoId, videos.id))
                .where(eq(videos.id, input.id))
                .groupBy(
                    videos.id,
                    users.id,
                    viewerReactions.type,
                )

            if (!existingVideo) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return existingVideo;
        }),


    generateDescription: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const { id: userId } = ctx.user;

            const { workflowRunId } = await workflow.trigger({
                url: `${process.env.UPSTASH_WORKFLOW_URL}/api/videos/workflows/description`,
                body: { userId, videoId: input.id },
            });

            return workflowRunId;
        }),

    generateTitle: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const { id: userId } = ctx.user;

            const { workflowRunId } = await workflow.trigger({
                url: `${process.env.UPSTASH_WORKFLOW_URL}/api/videos/workflows/title`,
                body: { userId, videoId: input.id },
            });

            return workflowRunId;
        }),

    generateThumbnail: protectedProcedure
        .input(z.object({ id: z.string().uuid(), prompt: z.string().min(10) }))
        .mutation(async ({ ctx, input }) => {
            const { id: userId } = ctx.user;

            const { workflowRunId } = await workflow.trigger({
                url: `${process.env.UPSTASH_WORKFLOW_URL}/api/videos/workflows/thumbnail`,
                body: { userId, videoId: input.id, prompt: input.prompt },
            });

            return workflowRunId;
        }),

    restoreThumbnail: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const { id: userId } = ctx.user;

            const [existingVideo] = await db
                .select()
                .from(videos)
                .where(and(
                    eq(videos.id, input.id),
                    eq(videos.userId, userId),
                ))

            if (!existingVideo) {
                throw new TRPCError({ code: "NOT_FOUND" })
            }

            if (existingVideo.thumbnailKey) {
                const utapi = new UTApi();

                await utapi.deleteFiles(existingVideo.thumbnailKey);
                await db.
                    update(videos)
                    .set({ thumbnailKey: null, thumbnailUrl: null })
                    .where(and(
                        eq(videos.id, input.id),
                        eq(videos.userId, userId),
                    ));
            }

            if (!existingVideo.muxPlaybackId) {
                throw new TRPCError({ code: "BAD_REQUEST" })
            }

            const utapi = new UTApi();

            const tempThumbnailUrl = `https://image.mux.com/${existingVideo.muxPlaybackId}/thumbnail.jpg`;
            const uploadedThumbnail = await utapi.uploadFilesFromUrl(tempThumbnailUrl);

            if (!uploadedThumbnail.data) {
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
            }

            const { key: thumbnailKey, url: thumbnailUrl } = uploadedThumbnail.data;

            const [updatedVideo] = await db
                .update(videos)
                .set({ thumbnailUrl, thumbnailKey })
                .where(and(
                    eq(videos.id, input.id),
                    eq(videos.userId, userId),
                ))
                .returning()

            return updatedVideo;
        }),

    remove: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const { id: userId } = ctx.user;

            try {
                // First, fetch the video to get asset IDs before deletion
                const [videoToDelete] = await db
                    .select()
                    .from(videos)
                    .where(and(
                        eq(videos.id, input.id),
                        eq(videos.userId, userId),
                    ))
                    .limit(1);

                if (!videoToDelete) {
                    return { success: false, message: "Video not found" };
                }

                // Clean up external resources
                let cleanupSuccess = true;

                // Delete from Mux if asset exists
                if (videoToDelete.muxAssetId) {
                    try {
                        await mux.video.assets.delete(videoToDelete.muxAssetId);
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        console.error(`Mux asset deletion error: ${errorMessage}`);
                        cleanupSuccess = false;
                    }
                }

                // Cancel upload if still in progress
                if (videoToDelete.muxUploadId && !videoToDelete.muxAssetId) {
                    try {
                        await mux.video.uploads.cancel(videoToDelete.muxUploadId);
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        console.error(`Mux upload cancellation error: ${errorMessage}`);
                    }
                }

                // Delete thumbnail from UploadThing if it exists
                if (videoToDelete.thumbnailKey) {
                    try {
                        const utapi = new UTApi();
                        const result = await utapi.deleteFiles(videoToDelete.thumbnailKey);
                        console.log(`Thumbnail deletion result:`, result);
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        console.error(`Thumbnail deletion error: ${errorMessage}`);
                    }
                }

                // Delete preview from UploadThing if it exists
                if (videoToDelete.previewKey) {
                    try {
                        const utapi = new UTApi();
                        await utapi.deleteFiles(videoToDelete.previewKey);
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        console.error(`Preview deletion error: ${errorMessage}`);
                    }
                }

                // Delete the video record from the database - even if some cleanups failed
                try {
                    await db
                        .delete(videos)
                        .where(and(
                            eq(videos.id, input.id),
                            eq(videos.userId, userId),
                        ));

                    return {
                        success: true,
                        id: input.id,
                        message: cleanupSuccess
                            ? "Video deleted successfully"
                            : "Video deleted but some resources may need manual cleanup"
                    };
                } catch (dbError: unknown) {
                    console.error("Database deletion error:", dbError);
                    return {
                        success: true, // Still return success to client since external resources were cleaned up
                        id: input.id,
                        message: "Video resources cleaned up but database record may still exist"
                    };
                }
            } catch (error: unknown) {
                console.error("Error during video deletion:", error);
                // Don't rethrow - return success if possible since resources were cleaned up
                return {
                    success: false,
                    message: "An error occurred during deletion, but resources may have been cleaned up"
                };
            }
        }),


    update: protectedProcedure
        .input(videoUpdateSchema)
        .mutation(async ({ ctx, input }) => {
            const { id: userId } = ctx.user;

            if (!input.id) {
                throw new TRPCError({ code: "BAD_REQUEST" })
            }

            const [updatedVideo] = await db
                .update(videos)
                .set({
                    title: input.title,
                    description: input.description,
                    categoryId: input.categoryId,
                    visibility: input.visibility,
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(videos.id, input.id),
                    eq(videos.userId, userId),
                ))
                .returning();

            if (!updatedVideo) {
                throw new TRPCError({ code: "NOT_FOUND" })
            }

            return updatedVideo;
        }),


    create: protectedProcedure.mutation(async ({ ctx }) => {
        const { id: userId } = ctx.user;
        const upload = await mux.video.uploads.create({
            new_asset_settings: {
                passthrough: userId,
                playback_policy: ["public"],
                input: [
                    {
                        generated_subtitles: [
                            {
                                language_code: "en",
                                name: "English"
                            },
                        ],
                    },
                ],
            },
            cors_origin: "*",  //TODO: in production set my url
        });


        const [video] = await db
            .insert(videos)
            .values({
                userId,
                title: "Untitle",
                muxStatus: "waiting",
                muxUploadId: upload.id,

            })
            .returning()

        return {
            video: video,
            url: upload.url,
        }
    }),
});





