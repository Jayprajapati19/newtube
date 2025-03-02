import { UploadDropzone } from "@/lib/uploadthing";
import { ResponsiveModal } from "@/components/responsive-modal";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

interface ThumbnailUploadModalProps {
    videoId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ThumbnailUploadModal = ({
    videoId, open, onOpenChange
}: ThumbnailUploadModalProps) => {
    const utils = trpc.useUtils();

    const onUploadComplete = () => {
        utils.studio.getMany.invalidate();
        utils.studio.getOne.invalidate({ id: videoId });
        toast.success("Thumbnail uploaded successfully ✅");
        onOpenChange(false);
    };

    return (
        <ResponsiveModal
            title="Upload a thumbnail"
            open={open}
            onOpenChange={onOpenChange}
        >
            <UploadDropzone
                endpoint="thumbnailUploader"
                input={{ videoId }}
                onClientUploadComplete={onUploadComplete}
            />
        </ResponsiveModal>
    );
};