import { db } from "@/db";
import { videos } from "@/db/schema";
import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
    },
    systemInstruction: `${TITLE_SYSTEM_PROMPT}
`,
});

export const generateResult = async (prompt: string): Promise<string> => {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // If text appears to be a JSON object, attempt to parse and extract the title.
    if (text.startsWith("{") && text.endsWith("}")) {
        try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === "object" && typeof parsed.title === "string") {
                return parsed.title.trim();
            }
        } catch {
            // If JSON parsing fails, fallback to plain text.
        }
    }
    // Return plain text as is.
    return text;
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

        const prompt = `Generate an SEO title for a YouTube video about a YouTube clone project. ` +
            `Transcript/Description: "${transcript || video.title || ''}"`;

        const title = await generateResult(prompt);
        if (!title) throw new Error("Title generation failed. No title returned");

        await context.run("update-video", async () => {
            await db
                .update(videos)
                .set({ title: title || video.title })
                .where(and(
                    eq(videos.id, video.id),
                    eq(videos.userId, video.userId)
                ));
        });
    }
);


