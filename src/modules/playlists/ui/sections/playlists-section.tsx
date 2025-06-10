"use client";

import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { trpc } from "@/trpc/client";
import { DEFAULT_LIMIT } from "@/constants";
import { VideoGridCardSkeleton } from "@/modules/videos/ui/components/video-grid-card";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { VideoRowCardSkeleton } from "@/modules/videos/ui/components/video-row-card";


export const PlaylistsSeaction = () => {
    return (
        <Suspense fallback={<HistoryVideoSeactionSkeleton />}>
            <ErrorBoundary fallback={<p>Error..</p>} >
                <HistoryVideoSeactionSuspense />
            </ErrorBoundary>
        </Suspense>
    )
}

const HistoryVideoSeactionSkeleton = () => {
    return (
        <div>
            <div className="flex flex-col gap-4 gap-y-10 md:hidden">
                {Array.from({ length: 18 }).map((_, index) => (
                    <VideoGridCardSkeleton key={index} />
                ))
                }
            </div>

            <div className="hidden flex-col gap-4  md:flex">
                {Array.from({ length: 18 }).map((_, index) => (
                    <VideoRowCardSkeleton key={index} size="compact" />
                ))
                }
            </div>
        </div>
    );
};

const HistoryVideoSeactionSuspense = () => {
    const [playlists, query] = trpc.playlists.getMany.useSuspenseInfiniteQuery(
        { limit: DEFAULT_LIMIT },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
    );

    return (
        <>
            <div className="flex flex-col gap-4 gap-y-10 ">
                {JSON.stringify(playlists)}
            </div>

            <InfiniteScroll
                hasNextPage={query.hasNextPage}
                isFetchingNextPage={query.isFetchingNextPage}
                fetchNextPage={query.fetchNextPage}
            />
        </>
    );
};