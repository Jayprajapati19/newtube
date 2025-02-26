"use client"

import { trpc } from "@/trpc/client"

export const VideosSection = () => {

    const [data] = trpc.studio.getMany.useSuspenseQuery

    // 5:40

    return (
        <div>
            Videos sections




        </div>
    )
}