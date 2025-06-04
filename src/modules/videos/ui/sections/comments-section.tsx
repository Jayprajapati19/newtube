"use client";

import { trpc } from "@/trpc/client";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { CommnetForm } from "@/modules/comments/ui/components/comment-form";
import { CommentItem } from "@/modules/comments/ui/components/comment-item";

interface CommentsSectionsProps {
    videoId: string;
}


export const CommetsSection = ({ videoId }: CommentsSectionsProps) => {
    return (
        <Suspense fallback={<p>Loading....</p>}>
            <ErrorBoundary fallback={<p>Error</p>}>
                <CommentsSectionSuspense videoId={videoId} />
            </ErrorBoundary>
        </Suspense>
    )
}


export const CommentsSectionSuspense = ({ videoId }: CommentsSectionsProps) => {

    const [comments] = trpc.comments.getMany.useSuspenseQuery({ videoId })
    return (
        <div className="mt-6">
            <div className="flex flex-col gap-6 ">
                <h1>
                    0 Comments
                </h1>
                <CommnetForm videoId={videoId} />
                <div className="flex flex-col gap-4 mt-2">
                    {comments.map((comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                        />
                    )))}
                </div>
            </div>
        </div>
    );
};