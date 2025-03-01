"use client"

import { z } from "zod";
import { trpc } from "@/trpc/client";
import { ErrorBoundary } from "react-error-boundary";
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { videoUpdateSchema } from "@/db/schema";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVerticalIcon, TrashIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormLabel, FormMessage, FormItem } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



interface FormSectionProps {
    videoId: string;

}

export const FormSection = ({ videoId }: FormSectionProps) => {
    return (
        <Suspense fallback={<FormSectionSkeleton />}>
            <ErrorBoundary fallback={<p>Error..</p>}>
                <FormSectionSuspense videoId={videoId} />
            </ErrorBoundary>
        </Suspense>
    );
};

const FormSectionSkeleton = () => {
    return <p>Loading....</p>

};

const FormSectionSuspense = ({ videoId }: FormSectionProps) => {
    const [video] = trpc.studio.getOne.useSuspenseQuery({ id: videoId })

    const form = useForm<z.infer<typeof videoUpdateSchema>>({
        resolver: zodResolver(videoUpdateSchema),
        defaultValues: video,
    });


    const onSubmit = async (data: z.infer<typeof videoUpdateSchema>) => {
        console.log(data);

    }


    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold">Video Details</h1>
                <p className="text-xs text-muted-foreground ">Manage Your video details</p>
            </div>
            <div className="flex items-center gap-x-2 ">
                <Button type="submit" disabled={false}>
                    Save
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVerticalIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" >
                        <DropdownMenuItem>
                            <TrashIcon className="size-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )


};