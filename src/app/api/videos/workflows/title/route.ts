import { db } from "@/db";
import { videos } from "@/db/schema";
import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";

interface InputType {
    userId: string;
    videoId: string;
}

const TITLE_SYSTEM_PROMPT = `Your task is to generate an SEO-focused title for a YouTube video 
based on its transcript. Please follow these guidelines:
- Be concise but descriptive, using relevant keywords to improve discoverability.
- Highlight the most compelling or unique aspect of the video content.
- Avoid jargon or overly complex language unless it directly supports searchability.
- Use action-oriented phrasing or clear value propositions where applicable.
- Ensure the title is 3-8 words long and no more than 100 characters.
- ONLY return the title as plain text. Do not add quotes or any additional formatting.`;

const generateTitle = async (transcript: string): Promise<string> => {
    const response = await fetch("https://api.gemini.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GEMINI_API_KEY!}`,
        },
        body: JSON.stringify({
            model: "gemini-1.5-flash",
            messages: [
                { role: "system", content: TITLE_SYSTEM_PROMPT },
                { role: "user", content: `Generate an SEO title for this YouTube video: ${transcript}` },
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content?.trim() || "Untitled Video";
};

export const { POST } = serve(async (context) => {
    try {
        const input = context.requestPayload as InputType;
        const { videoId, userId } = input;

        const video = await context.run("get-video", async () => {
            const [existingVideo] = await db
                .select()
                .from(videos)
                .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));
            if (!existingVideo) throw new Error("Video not found");
            return existingVideo;
        });

        const transcript = await context.run("get-transcript", async () => {
            const trackUrl = `https://stream.mux.com/${video.muxPlaybackId}/text/${video.muxTrackId}.txt`;
            const response = await fetch(trackUrl);
            if (!response.ok) {
                throw new Error("Transcript not found");
            }
            return response.text();
        });

        const title = await generateTitle(transcript || video.title || "");
        if (!title) throw new Error("Title generation failed. No title returned");

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
