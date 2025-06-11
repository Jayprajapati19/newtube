"use client";

import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { trpc } from "@/trpc/client";
import { DEFAULT_LIMIT } from "@/constants";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { toast } from "sonner";
import Link from "next/link";
import { SubscriptionItem, SubscriptionItemSkeleton } from "../components/subscription-item";


export const SubscriptionsSeaction = () => {
    return (
        <Suspense fallback={<SubscriptionsSeactionSkeleton />}>
            <ErrorBoundary fallback={<p>Error..</p>} >
                <SubscriptionsSeactionSuspense />
            </ErrorBoundary>
        </Suspense>
    )
}

const SubscriptionsSeactionSkeleton = () => {
    return (
        <div className="flex flex-col gap-4">
            {Array.from({ length: 9 }).map((_, index) => (
                <SubscriptionItemSkeleton key={index} />
            ))
            }
        </div>

    );
};

const SubscriptionsSeactionSuspense = () => {
    const utils = trpc.useUtils();

    const [subscriptions, query] = trpc.subscriptions.getMany.useSuspenseInfiniteQuery(
        { limit: DEFAULT_LIMIT },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
    );

    const unsubscribe = trpc.subscriptions.remove.useMutation({
        onSuccess: (data) => {

            toast.success("Unsubscribed! 🔕");
            utils.subscriptions.getMany.invalidate();
            utils.videos.getManySubscribed.invalidate();
            utils.users.getOne.invalidate({ id: data.creatorId });

        },
        onError: () => {
            toast.error("Semothing went wrong🔕");

        },
    });

    return (
        <>
            <div className="flex flex-col gap-4">
                {subscriptions.pages
                    .flatMap((page) => page.items)
                    .map((subscription) => (
                        <Link prefetch key={subscription.creatorId} href={`/users/${subscription.user.id}`}>
                            <SubscriptionItem
                                name={subscription.user.name}
                                imageUrl={subscription.user.ImageUrl}
                                subscriberCount={subscription.user.subscriberCount}
                                onUnsubscribe={() => {
                                    unsubscribe.mutate({ userId: subscription.creatorId });
                                }}
                                disabled={unsubscribe.isPending}

                            />
                        </Link>
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