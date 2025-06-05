import { z } from "zod";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import { comments, commentsReactions, users } from "@/db/schema";
import { and, count, desc, eq, getTableColumns, inArray, lt, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";


export const commentsRouter = createTRPCRouter({
    remove: protectedProcedure
        .input(z.object({
            id: z.string().uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            const { id } = input;
            const { id: userId } = ctx.user;

            const [deletedComment] = await db
                .delete(comments)
                .where(and(
                    eq(comments.userId, userId),
                    eq(comments.id, id),
                ))
                .returning();

            if (!deletedComment) {
                throw new TRPCError({ code: "NOT_FOUND" })
            }

            return deletedComment;
        }),

    create: protectedProcedure
        .input(z.object({
            parentId: z.string().uuid().nullish(),
            videoId: z.string().uuid(),
            value: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            const { parentId, videoId, value } = input;
            const { id: userId } = ctx.user;

            const [existingComment] = await db
                .select()
                .from(comments)
                .where(inArray(comments.id, parentId ? [parentId] : []))

            if (existingComment && parentId) {
                throw new TRPCError({ code: "NOT_FOUND" })
            }

            if (existingComment?.parentId && parentId) {
                throw new TRPCError({ code: "BAD_REQUEST" })
            }


            const [createdComment] = await db
                .insert(comments)
                .values({
                    videoId,
                    userId,
                    parentId,
                    value
                })
                .returning();

            return createdComment;
        }),

    getMany: baseProcedure
        .input(z.object({
            videoId: z.string().uuid(),
            cursor: z.object({
                id: z.string().uuid(),
                updatedAt: z.date(),
            }).nullish(),
            limit: z.number().min(1).max(100),

        }),
        )
        .query(async ({ input, ctx }) => {
            const { clerkUserId } = ctx;
            const { videoId, cursor, limit } = input;

            let userId;

            const [user] = await db
                .select()
                .from(users)
                .where(inArray(users.clerkId, clerkUserId ? [clerkUserId] : []))

            if (user) {
                userId = user.id;
            }

            const viewerReactions = db.$with("viewer_reactions").as(
                db.select({
                    commentId: commentsReactions.commentId,
                    type: commentsReactions.type,
                })
                    .from(commentsReactions)
                    .where(inArray(commentsReactions.userId, userId ? [userId] : []))
            )

            const [totalData, data] = await Promise.all([
                db
                    .select({
                        count: count(),
                    })
                    .from(comments)
                    .where(eq(comments.videoId, videoId)),
                db
                    .with(viewerReactions)
                    .select({
                        ...getTableColumns(comments),
                        user: users,
                        viewerReaction: viewerReactions.type,
                        likeCount: db.$count(
                            commentsReactions,
                            and(
                                eq(commentsReactions.type, "like"),
                                eq(commentsReactions.commentId, comments.id)
                            )
                        ),
                        dislikeCount: db.$count(
                            commentsReactions,
                            and(
                                eq(commentsReactions.type, "dislike"),
                                eq(commentsReactions.commentId, comments.id)
                            )
                        )

                    })
                    .from(comments)
                    .where(and(
                        eq(comments.videoId, videoId),
                        cursor
                            ? or(
                                lt(comments.updatedAt, cursor.updatedAt),
                                and(
                                    eq(comments.updatedAt, cursor.updatedAt),
                                    lt(comments.id, cursor.id)
                                )
                            )
                            : undefined,
                    ))
                    .innerJoin(users, eq(comments.userId, users.id))
                    .leftJoin(viewerReactions, eq(comments.id, viewerReactions.commentId))
                    .orderBy(desc(comments.updatedAt), desc(comments.id))
                    .limit(limit + 1)


            ])



            const hasMore = data.length > limit;
            // Remove the last item if there is more data   
            const items = hasMore ? data.slice(0, -1) : data;
            // set rhe next cursor to the last item if there is more data
            const lastItem = items[items.length - 1];

            const nextCursor = hasMore
                ? {
                    id: lastItem.id,
                    updatedAt: lastItem.updatedAt,
                }
                : null;


            return {
                totalCount: totalData[0].count,
                items,
                nextCursor,
            }
        }),
});
