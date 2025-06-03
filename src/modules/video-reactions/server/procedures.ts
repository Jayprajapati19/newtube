import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import { videoReactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";


export const videoReactionsRouter = createTRPCRouter({
    like: protectedProcedure
        .input(z.object({ videoId: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
            const { videoId } = input;
            const { id: userId } = ctx.user;

            const [existingVideoReactionsLike] = await db
                .select()
                .from(videoReactions)
                .where(
                    and(
                        eq(videoReactions.videoId, videoId),
                        eq(videoReactions.userId, userId),
                        eq(videoReactions.type, "like")
                    )
                );
            if (existingVideoReactionsLike) {
                const [deletedViewreaction] = await db
                    .delete(videoReactions)
                    .where(
                        and(
                            eq(videoReactions.userId, userId),
                            eq(videoReactions.videoId, videoId),
                        )
                    )
                    .returning();

                return deletedViewreaction;
            }
            const [createdVideoReactions] = await db
                .insert(videoReactions)
                .values({
                    videoId,
                    userId,
                    type: "like",
                })
                .onConflictDoUpdate({
                    target: [videoReactions.userId, videoReactions.videoId],
                    set: {
                        type: "like",
                    },
                })
                .returning();

            return createdVideoReactions;
        }),

    dislike: protectedProcedure
        .input(z.object({ videoId: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
            const { videoId } = input;
            const { id: userId } = ctx.user;

            const [existingVideoReactionsDislike] = await db
                .select()
                .from(videoReactions)
                .where(
                    and(
                        eq(videoReactions.videoId, videoId),
                        eq(videoReactions.userId, userId),
                        eq(videoReactions.type, "dislike")
                    )
                );
            if (existingVideoReactionsDislike) {
                const [deletedViewreaction] = await db
                    .delete(videoReactions)
                    .where(
                        and(
                            eq(videoReactions.userId, userId),
                            eq(videoReactions.videoId, videoId),
                        )
                    )
                    .returning();

                return deletedViewreaction;
            }
            const [createdVideoReactions] = await db
                .insert(videoReactions)
                .values({
                    videoId,
                    userId,
                    type: "dislike",
                })
                .onConflictDoUpdate({
                    target: [videoReactions.userId, videoReactions.videoId],
                    set: {
                        type: "dislike",
                    },
                })
                .returning();

            return createdVideoReactions;
        }),
});
