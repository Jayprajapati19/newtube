import { toast } from "sonner"
import { useClerk } from "@clerk/nextjs"

import { trpc } from "@/trpc/client"

interface UseSubscriptionProps {
    userId: string,
    isSubscribed: boolean,
    fromVideoId?: string,
}

// 2:21 - part two