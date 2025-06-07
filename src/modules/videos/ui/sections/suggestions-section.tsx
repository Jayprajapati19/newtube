"use client";

import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";


interface SuggetionsProps {
    videoId: string;

}

export const SuggestionSection = ({
    videoId,
}: SuggetionsProps) => {

    const [suggestions] = trpc.suggestions.getMany.useSuspenseInfiniteQuery({
        videoId,
        limit: DEFAULT_LIMIT,

    }, {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

    return (
        <div>
            {JSON.stringify(suggestions)}
        </div>
    );
};