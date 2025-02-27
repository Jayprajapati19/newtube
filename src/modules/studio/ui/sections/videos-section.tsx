"use client"

import { trpc } from "@/trpc/client"

export const VideosSection = () => {

    const [data] = trpc.studio.getMany.useSuspenseInfiniteQuery();

    // 5:40

    return (
        <div>
            Videos sections




        </div>
    )
}