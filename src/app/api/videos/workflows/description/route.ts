import { db } from "@/db";
import { videos } from "@/db/schema";
import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface InputType {
    userId: string;
    videoId: string;
}

const DESCRIPTION_SYSTEM_PROMPT = `Your task is to summarize the transcript of a video. Please follow these guidelines:
- Be brief. Condense the content into a summary that captures the key points and main ideas without losing important details.
- Avoid jargon or overly complex language unless necessary for the context.
- Focus on the most critical information, ignoring filler, repetitive statements, or irrelevant tangents.
- ONLY return the summary as plain text, without JSON formatting or any extra annotations.
- Ensure the summary is 3-5 sentences long and no more than 200 characters.`;

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "text/plain",  // Ensure raw text response
        temperature: 0.4,
    },
    systemInstruction: DESCRIPTION_SYSTEM_PROMPT,
});

/**
 * Generates a clean text summary from Gemini AI
 */
export const generateResult = async (prompt: string): Promise<string> => {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Ensure the response is plain text, remove unnecessary formatting
    text = text.replace(/^"+|"+$/g, "").trim();  // Remove surrounding quotes

    return text;
};

export const { POST } = serve(async (context) => {
    const input = context.requestPayload as InputType;
    const { videoId, userId } = input;

    console.log(`Processing videoId: ${videoId}, userId: ${userId}`);

    // Fetch video details
    const video = await context.run("get-video", async () => {
        const [existingVideo] = await db
            .select()
            .from(videos)
            .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

        if (!existingVideo) throw new Error("Video not found");
        return existingVideo;
    });

    console.log("Fetched video:", video);

    // Fetch transcript from Mux
    const transcript = await context.run("get-transcript", async () => {
        const trackUrl = `https://stream.mux.com/${video.muxPlaybackId}/text/${video.muxTrackId}.txt`;
        console.log("Fetching transcript from:", trackUrl);

        const response = await fetch(trackUrl);
        if (!response.ok) throw new Error("Transcript not found");

        return await response.text();
    });

    console.log("Fetched transcript (first 100 chars):", transcript.substring(0, 100));

    // Generate description
    const prompt = `Summarize the following transcript for a YouTube video description:\n${transcript}`;
    const description = await generateResult(prompt);

    if (!description) throw new Error("Description generation failed. No description returned");

    console.log("Generated description:", description);

    // Update video description in the database
    await context.run("update-video", async () => {
        await db
            .update(videos)
            .set({ description })
            .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
    });

    console.log("Description updated successfully.");
});
