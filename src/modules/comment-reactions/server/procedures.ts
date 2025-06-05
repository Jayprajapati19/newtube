import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import { commentsReactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";


export const commentReactionsRouter = createTRPCRouter({
    like: protectedProcedure
        .input(z.object({ commentId: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
            const { commentId } = input;
            const { id: userId } = ctx.user;

            const [existingCommentReactionsLike] = await db
                .select()
                .from(commentsReactions)
                .where(
                    and(
                        eq(commentsReactions.commentId, commentId),
                        eq(commentsReactions.userId, userId),
                        eq(commentsReactions.type, "like")
                    )
                );
            if (existingCommentReactionsLike) {
                const [deletedViewreaction] = await db
                    .delete(commentsReactions)
                    .where(
                        and(
                            eq(commentsReactions.userId, userId),
                            eq(commentsReactions.commentId, commentId),
                        )
                    )
                    .returning();

                return deletedViewreaction;
            }
            const [createdCommentReactions] = await db
                .insert(commentsReactions)
                .values({
                    commentId,
                    userId,
                    type: "like",
                })
                .onConflictDoUpdate({
                    target: [commentsReactions.userId, commentsReactions.commentId],
                    set: {
                        type: "like",
                    },
                })
                .returning();

            return createdCommentReactions;
        }),

    dislike: protectedProcedure
        .input(z.object({ commentId: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
            const { commentId } = input;
            const { id: userId } = ctx.user;

            const [existingCommentReactionsDislike] = await db
                .select()
                .from(commentsReactions)
                .where(
                    and(
                        eq(commentsReactions.commentId, commentId),
                        eq(commentsReactions.userId, userId),
                        eq(commentsReactions.type, "dislike")
                    )
                );
            if (existingCommentReactionsDislike) {
                const [deletedViewreaction] = await db
                    .delete(commentsReactions)
                    .where(
                        and(
                            eq(commentsReactions.userId, userId),
                            eq(commentsReactions.commentId, commentId),
                        )
                    )
                    .returning();

                return deletedViewreaction;
            }
            const [createdCommentReactions] = await db
                .insert(commentsReactions)
                .values({
                    commentId,
                    userId,
                    type: "dislike",
                })
                .onConflictDoUpdate({
                    target: [commentsReactions.userId, commentsReactions.commentId],
                    set: {
                        type: "dislike",
                    },
                })
                .returning();

            return createdCommentReactions;
        }),
});
