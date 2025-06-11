import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";
import { Loader2Icon, SquareCheckIcon, SquareIcon } from "lucide-react";


interface PlaylistAddModalProps {
    videoId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}



export const PlaylistAdddModal = ({
    videoId,
    open,
    onOpenChange
}: PlaylistAddModalProps) => {

    const utils = trpc.useUtils();

    const { data: playlists, isLoading } = trpc.playlists.getManyForVideo.useInfiniteQuery({
        limit: DEFAULT_LIMIT,
        videoId,
    }, {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: !!videoId && open, // Only fetch if videoId is available and modal is open

    })

    // const handleOpenChange = (newOpen: boolean) => {
    //     utils.playlists.getManyForVideo.reset()
    //     onOpenChange(newOpen);
    // }

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
                {!isLoading &&
                    playlists?.pages
                        .flatMap((page) => page.items)
                        .map((playlist) => (
                            <Button
                                key={playlist.id}
                                variant="ghost"
                                className="w-full justify-start px-2 [&_svg]:size-5 "
                                size="lg"
                            >
                                {playlist.containsVideo ? (
                                    <SquareCheckIcon className="mr-2" />
                                ) : (
                                    <SquareIcon cn />
                                )}
                                {playlist.name}
                            </Button>
                        ))
                }
            </div>
        </ResponsiveModal>
    );
};

