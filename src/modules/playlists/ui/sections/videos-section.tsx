"use client";

import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { trpc } from "@/trpc/client";
import { DEFAULT_LIMIT } from "@/constants";
import { VideoGridCard, VideoGridCardSkeleton } from "@/modules/videos/ui/components/video-grid-card";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { VideoRowCard, VideoRowCardSkeleton } from "@/modules/videos/ui/components/video-row-card";
import { toast } from "sonner";


interface VideoSectionProps {
    playlistId: string;
}

export const VideosSeaction = (props: VideoSectionProps) => {
    return (
        <Suspense fallback={<VideoSeactionSkeleton />}>
            <ErrorBoundary fallback={<p>Error</p>} >
                <VideoSeactionSuspense {...props} />
            </ErrorBoundary>
        </Suspense >
    )
}

const VideoSeactionSkeleton = () => {
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

const VideoSeactionSuspense = ({ playlistId }: VideoSectionProps) => {
    const [videos, query] = trpc.playlists.getVideos.useSuspenseInfiniteQuery(
        { limit: DEFAULT_LIMIT, playlistId },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
    );

    const utils = trpc.useUtils();

    const removeVideo = trpc.playlists.removeVideo.useMutation({
        onSuccess: (data) => {
            toast.success("Video removed from playlist");
            utils.playlists.getMany.invalidate();
            utils.playlists.getManyForVideo.invalidate({ videoId: data.videoId });
            utils.playlists.getOne.invalidate({ id: data.playlistId })
            utils.playlists.getVideos.invalidate({ playlistId: data.playlistId })
        },
        onError: () => {
            toast.error("Something went wrong ❌");
        },
    })



    return (
        <>
            <div className="flex flex-col gap-4 gap-y-10 md:hidden">
                {videos.pages
                    .flatMap((page) => page.items)
                    .map((video) => (
                        <VideoGridCard
                            key={video.id}
                            data={video}
                            onRemove={() => removeVideo.mutate({ playlistId, videoId: video.id })} />
                    ))
                }
            </div>
            <div className="hidden flex-col gap-4 md:flex">
                {videos.pages
                    .flatMap((page) => page.items)
                    .map((video) => (
                        <VideoRowCard
                            key={video.id}
                            data={video} size="compact"
                            onRemove={() => removeVideo.mutate({ playlistId, videoId: video.id })} />
                    ))
                }
            </div>
            <InfiniteScroll
                hasNextPage={query.hasNextPage}
                isFetchingNextPage={query.isFetchingNextPage}
                fetchNextPage={query.fetchNextPage}
            />
        </>
    );
};