"use client";

import { trpc } from "@/trpc/client";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { CommnetForm } from "@/modules/comments/ui/components/comment-form";

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
            </div>
            {JSON.stringify(comments)}
        </div>
    );
};