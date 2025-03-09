import { db } from "@/db";
import { videos } from "@/db/schema";
import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";

interface InputType {
    userId: string;
    videoId: string;
    prompt: string;
}


const generateTitle = async (transcript: string): Promise<string> => {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY!}`,
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: TITLE_SYSTEM_PROMPT },
                { role: "user", content: `Generate an SEO title for this YouTube video: ${transcript}` },
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content?.trim() || "Untitled Video";
};

export const { POST } = serve(async (context) => {
    try {
        const input = context.requestPayload as InputType;
        const { videoId, userId, propmpt } = input;

        const video = await context.run("get-video", async () => {
            const [existingVideo] = await db
                .select()
                .from(videos)
                .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

            if (!existingVideo) throw new Error("Video not found");
            return existingVideo;
        });




        const { body } = await context.call("generate-thumbnail", {
            url: "gemini image generation model link"
            // 11:22
        })


        const title = await generateTitle(transcript || video.title || "");

        await context.run("update-video", async () => {
            await db
                .update(videos)
                .set({ title })
                .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
        });

        return new Response(title, {
            headers: { "Content-Type": "text/plain" },
        });
    } catch (error: any) {
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
});
