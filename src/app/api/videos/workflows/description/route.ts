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
- ONLY return the summary, no other text, annotations, or comments.
- Aim for a summary that is 3-5 sentences long and no more than 200 characters.`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
    },
    systemInstruction: `${DESCRIPTION_SYSTEM_PROMPT}
`,
});

export const generateResult = async (prompt: string): Promise<string> => {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object" && typeof parsed.description === "string") {
            return parsed.description.trim();
        }
    } catch {
        // If not valid JSON then simply remove surrounding quotes.
    }
    // Remove any surrounding quotes if present and return plain description.
    return text.replace(/^"+|"+$/g, "").trim();
};

export const { POST } = serve(
    async (context) => {
        const input = context.requestPayload as InputType;
        const { videoId, userId } = input;

        const video = await context.run("get-video", async () => {
            const [existingVideo] = await db
                .select()
                .from(videos)
                .where(and(
                    eq(videos.id, videoId),
                    eq(videos.userId, userId)
                ));
            if (!existingVideo) throw new Error("Video not found");
            return existingVideo;
        });

        const transcript = await context.run("get-transcript", async () => {
            const trackUrl = `https://stream.mux.com/${video.muxPlaybackId}/text/${video.muxTrackId}.txt`;
            const response = await fetch(trackUrl);

            if (!response.ok) {
                throw new Error("Transcript not found");
            }

            const text = await response.text();
            return text;
        });

        const prompt = `Summarize the following transcript for a YouTube video description: ` +
            `Transcript: "${transcript || video.description || ''}"`;

        const description = await generateResult(prompt);
        if (!description) throw new Error("Description generation failed. No description returned");

        await context.run("update-video", async () => {
            await db
                .update(videos)
                .set({ description: description || video.description })
                .where(and(
                    eq(videos.id, video.id),
                    eq(videos.userId, video.userId)
                ));
        });
    }
);


