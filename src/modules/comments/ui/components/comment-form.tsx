import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";

import { trpc } from "@/trpc/client";
import { commentInsertSchema } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

interface CommnetFormProps {
    videoId: string;
    parentId?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
    variant?: "comment" | "reply"
}

export const CommentForm = ({ videoId, onSuccess, parentId, onCancel, variant = "comment" }: CommnetFormProps) => {
    const clerk = useClerk();
    const { user } = useUser();

    const utils = trpc.useUtils();
    const create = trpc.comments.create.useMutation({
        onSuccess: () => {
            utils.comments.getMany.invalidate({ videoId });
            form.reset();
            toast.success("Comment Added 💬");
            onSuccess?.();
        },
        onError: (error) => {
            toast.error("Something went wrong");

            if (error.data?.code === "UNAUTHORIZED") {
                clerk.openSignIn();
            }
        },
    });

    // ✅ FIX: use the omitted schema for typing and validation
    const commentFormSchema = commentInsertSchema.omit({ userId: true });

    const form = useForm<z.infer<typeof commentFormSchema>>({
        resolver: zodResolver(commentFormSchema),
        defaultValues: {
            parentId: parentId,
            videoId: videoId,
            value: "",
        },
    });

    const handleSubmit = (values: z.infer<typeof commentFormSchema>) => {
        create.mutate(values);
    };

    const handleCancel = () => {
        form.reset();
        onCancel?.();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex gap-4 group">
                <UserAvatar
                    size="lg"
                    imageUrl={user?.imageUrl || "/user-placeholder.svg"}
                    name={user?.username || "User"}
                />

                <div className="flex-1">
                    <FormField
                        name="value"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder={
                                            variant === "reply"
                                                ? "Reply to this comment..."
                                                : "Add a comment..."
                                        }
                                        className="resize-none bg-transparent overflow-hidden min-h-0"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="justify-end gap-2 mt-2 flex">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            disabled={create.isPending}
                            type="submit"
                            size="sm">
                            {variant === "reply" ? "Reply" : "Comment"}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
};
