"use client"

import { trpc } from "@/trpc/client"

export const PageClient = () => {
    const [data] = trpc.hello.useSuspenseQuery({
        text: "Jayy"
    })

    return (
        <div>
            page client says:{data.greeting}
        </div>
    )
}