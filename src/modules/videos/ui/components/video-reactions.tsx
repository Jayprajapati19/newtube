import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Separator } from "@radix-ui/react-select";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"

// TODO: Properly implement reactions 

export const VideoReactions = () => {

    const viewerReaction: "like" | "dislike" = "like";

    return (
        <div className="flex items-center flex-none">
            <Button
                variant="secondary"
                className="rounded-l-full rounded-r-none gap-2 pr-4"
            >
                <ThumbsUpIcon className={cn("size-5", viewerReaction === "like" && "fill-black")} />
                {1}
            </Button>
            <Separator aria-orientation="vertical" className="h-7" />
            <Button
                variant="secondary"
                className="rounded-l-none rounded-r-full pl-3"
            >
                <ThumbsDownIcon className={cn("size-5", viewerReaction !== "like" && "fill-black")} />
                {1}
            </Button>
        </div>
    )
}