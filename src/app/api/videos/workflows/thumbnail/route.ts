import { db } from "@/db";
import { videos } from "@/db/schema";
import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";
import { UTApi } from "uploadthing/server";

interface InputType {
    userId: string;
    videoId: string;
    prompt: string;
}

export const { POST } = serve(async (context) => {
    try {
        const input = context.requestPayload as InputType;
        const { videoId, userId, prompt } = input;

        // Fetch existing video
        const video = await context.run("get-video", async () => {
            const [existingVideo] = await db
                .select()
                .from(videos)
                .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

            if (!existingVideo) throw new Error("Video not found");
            return existingVideo;
        });

        // Generate thumbnail using Gemini image generation model
        const response = await fetch("https://generativelanguage.googleapis.com/v1/models/imagen-3.0-generate-002:generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GEMINI_API_KEY}`
            },
            body: JSON.stringify({
                prompt,
                n: 1,
                model: "imagen-3.0-generate-002",
                size: "1792x1024"
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.statusText}`);
        }

        const { data } = await response.json();
        const tempThumbnailUrl = data?.[0]?.url;

        if (!tempThumbnailUrl) {
            throw new Error("Failed to generate thumbnail");
        }

        // Upload the generated thumbnail
        const uploadedThumbnail = await context.run("upload-thumbnail", async () => {
            const utapi = new UTApi();
            const { data, error } = await utapi.uploadFilesFromUrl(tempThumbnailUrl);

            if (error) {
                throw new Error("Thumbnail upload failed");
            }

            return data;
        });

        // Update video record with the new thumbnail URL
        await context.run("update-video", async () => {
            await db
                .update(videos)
                .set({ thumbnailUrl: uploadedThumbnail.url })
                .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
        });

        return new Response(JSON.stringify({ thumbnailUrl: uploadedThumbnail.url }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
});
