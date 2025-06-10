import { z } from "zod";
import { toast } from "sonner"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc/client";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface PlaylistCreateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
    name: z.string().min(1),
});

export const PlaylistCreatedModal = ({
    open, onOpenChange
}: PlaylistCreateModalProps) => {

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
        }
    });


    const create = trpc.playlists.create.useMutation({
        onSuccess: () => {
            toast.success("Playlist created");
            form.reset();
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Something went wrong ❌");
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        create.mutate(values)
    };

    return (
        <ResponsiveModal
            title="Create a Playlist"
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
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="My favorite videos"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />


                    <div className="flex justify-end">
                        <Button
                            disabled={create.isPending}
                            type="submit"
                        >
                            Create
                        </Button>
                    </div>

                </form>

            </Form>
        </ResponsiveModal>
    );
};