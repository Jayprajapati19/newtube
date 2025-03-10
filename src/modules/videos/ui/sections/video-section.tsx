"use client"

import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { trpc } from "@/trpc/client";


interface VideoSectionProps {
    videoId: string;
}


export const VideoSection = ({ videoId }: VideoSectionProps) => {
    return (
        <Suspense fallback={<p>Loading..</p>}>
            <ErrorBoundary fallback={<p>Error..</p>}>
                <VideoSectionSuspense videoId={videoId} />
            </ErrorBoundary>
        </Suspense>
    )
}

const VideoSectionSuspense = ({ videoId }: VideoSectionProps) => {
    const [video] = trpc.videos.getOne.useSuspenseQuery({ id: videoId });

    return (
        <div>
            {JSON.stringify(video)}
        </div>
    )
}