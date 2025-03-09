import { z } from "zod";
import { toast } from "sonner"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/trpc/client";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface ThumbnailGenerateModalProps {
    videoId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
    prompt: z.string().min(10),
});

export const ThumbnailGeneratedModal = ({
    videoId, open, onOpenChange
}: ThumbnailGenerateModalProps) => {

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            prompt: "",
        }
    });


    const generateThumbnail = trpc.videos.generateThumbnail.useMutation({
        onSuccess: () => {

            toast.success("Background job started", { description: "this may take some time" });

        },
        onError: () => {
            toast.error("Something went wrong ❌");
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        generateThumbnail.mutate({
            id: videoId,
            prompt: values.prompt,
        });
    };

    return (
        <ResponsiveModal
            title="Upload a thumbnail"
            open={open}
            onOpenChange={onOpenChange}
        >
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-4"
                >
                    <FormField
                        control={form.control}
                        name="prompt"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Prompt</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        className="resize-none"
                                        cols={30}
                                        rows={5}
                                        placeholder="A description of waanted thumbnail"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />


                    <div className="flex justify-end">
                        <Button
                            type="submit"
                        >
                            Generate
                        </Button>
                    </div>

                </form>

            </Form>
        </ResponsiveModal>
    );
};