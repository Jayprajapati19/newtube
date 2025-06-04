"use client";

import { trpc } from "@/trpc/client";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { CommnetForm } from "@/modules/comments/ui/components/comment-form";
import { CommentItem } from "@/modules/comments/ui/components/comment-item";
import { DEFAULT_LIMIT } from "@/constants";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { Loader2Icon } from "lucide-react";

interface CommentsSectionsProps {
    videoId: string;
}


export const CommetsSection = ({ videoId }: CommentsSectionsProps) => {
    return (
        <Suspense fallback={<CommentsSectionSkeleton />}>
            <ErrorBoundary fallback={<p>Error</p>}>
                <CommentsSectionSuspense videoId={videoId} />
            </ErrorBoundary>
        </Suspense>
    )
}

const CommentsSectionSkeleton = () => {
    return (
        <div className="mt-6 flex justify-center items-center">
            <Loader2Icon
                className="textmuted-foreground size-7 animate-spin"
            />
        </div>
    )
}


export const CommentsSectionSuspense = ({ videoId }: CommentsSectionsProps) => {

    const [comments, query] = trpc.comments.getMany.useSuspenseInfiniteQuery({
        videoId,
        limit: DEFAULT_LIMIT
    }, {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

    return (
        <div className="mt-6">
            <div className="flex flex-col gap-6 ">
                <h1 className="text-xl font-bold">
                    {comments.pages[0].totalCount} Comments
                </h1>
                <CommnetForm videoId={videoId} />
                <div className="flex flex-col gap-4 mt-2">
                    {comments.pages.flatMap((page) => page.items).map((comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                        />
                    )))}
                    <InfiniteScroll
                        isManual
                        hasNextPage={query.hasNextPage}
                        isFetchingNextPage={query.isFetchingNextPage}
                        fetchNextPage={query.fetchNextPage}
                    />
                </div>
            </div>
        </div>
    );
};