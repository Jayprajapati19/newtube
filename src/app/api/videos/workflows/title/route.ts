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

/**
 * Generates an SEO-friendly title using Gemini API.
 */
const generateTitle = async (transcript: string): Promise<string> => {
    console.log("Generating title for transcript:", transcript.substring(0, 100));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: [
                { role: "user", parts: [{ text: TITLE_SYSTEM_PROMPT }] },
                { role: "user", parts: [{ text: `Generate an SEO title for this YouTube video: ${transcript}` }] },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Gemini API Error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Gemini API Response:", JSON.stringify(result, null, 2));

    return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Untitled Video";
};

export const { POST } = serve(async (context) => {
    const input = context.requestPayload as InputType;
    const { videoId, userId } = input;

    console.log(`Processing videoId: ${videoId}, userId: ${userId}`);

    // Fetch the video details
    const video = await context.run("get-video", async () => {
        const [existingVideo] = await db
            .select()
            .from(videos)
            .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

        if (!existingVideo) {
            console.error("Video not found");
            throw new Error("Video not found");
        }

        return existingVideo;
    });

    console.log("Fetched video:", video);

    // Fetch transcript from Mux
    const transcript = await context.run("get-transcript", async () => {
        const trackUrl = `https://stream.mux.com/${video.muxPlaybackId}/text/${video.muxTrackId}.txt`;
        console.log("Fetching transcript from:", trackUrl);

        const response = await fetch(trackUrl);
        if (!response.ok) {
            console.error("Transcript not found");
            throw new Error("Transcript not found");
        }

        return response.text();
    });

    console.log("Fetched transcript (first 100 chars):", transcript.substring(0, 100));

    // Generate the title using Gemini API
    const title = await generateTitle(transcript || video.title || "");
    if (!title) {
        console.error("Title generation failed. No title returned.");
        throw new Error("Title generation failed. No title returned");
    }

    console.log("Generated title:", title);

    // Update the video title in the database
    await context.run("update-video", async () => {
        await db
            .update(videos)
            .set({ title })
            .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
    });

    console.log("Title updated successfully.");
});
