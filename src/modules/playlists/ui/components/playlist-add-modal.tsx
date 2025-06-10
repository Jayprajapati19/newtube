import { ResponsiveModal } from "@/components/responsive-modal";
import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";
import { Loader2Icon } from "lucide-react";


interface PlaylistAddModalProps {
    videoId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}



export const PlaylistAdddModal = ({
    videoId,
    open, onOpenChange
}: PlaylistAddModalProps) => {

    const { data, isLoading } = trpc.playlists.getManyForVideo.useInfiniteQuery({
        limit: DEFAULT_LIMIT,
        videoId,
    }, {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: !!videoId && open, // Only fetch if videoId is available and modal is open

    })



    return (
        <ResponsiveModal
            title="Add to Playlist"
            open={open}
            onOpenChange={onOpenChange}
        >
            <div className="flex flex-col gap-2">
                {isLoading && (
                    <div className="flex justify-center p-4">
                        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                    </div>
                )}
                {JSON.stringify(data)}
            </div>
        </ResponsiveModal>
    );
};

// 9:1
