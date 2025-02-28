"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { trpc } from "@/trpc/client"
import { Loader2Icon, PlusIcon } from "lucide-react"
import { ResponsiveModal } from "@/components/responsive-modal"

export const StudioUploadModal = () => {

    const utils = trpc.useUtils();


    const create = trpc.videos.create.useMutation({
        onSuccess: () => {
            toast.success("Video created successfully ✅")
            utils.studio.getMany.invalidate();
        },

        onError: () => {
            toast.error("Something went wrong ❌")
        }

    });

    return (

        <>
            <ResponsiveModal
                title="Upload video"
                open={!!create.data}
                onOpenChange={() => create.reset()}
            // 6:33
            >
                <p>This will be an uploder</p>
            </ResponsiveModal>

            <Button variant="secondary" onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
                Create
            </Button>

        </>
    )
}