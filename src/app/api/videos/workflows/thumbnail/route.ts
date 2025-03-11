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

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// 🔹 Helper function: Fetch with retry mechanism
async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res.json();

            if (res.status === 429) {
                console.warn(`Rate limit hit, retrying in ${RETRY_DELAY * (i + 1)}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1))); // Exponential backoff
            } else {
                const errorText = await res.text();
                throw new Error(`API request failed: ${res.status} - ${res.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        }
    }
    throw new Error("Max retries reached.");
}

// 🔹 Workflow API
export const { POST } = serve(async (context): Promise<void> => {
    try {
        // ✅ Step 1: Parse Input
        const { videoId, userId, prompt } = await context.run("parse-input", async () => {
            const input = context.requestPayload as InputType;
            console.log("Processing video for:", input);
            return input;
        });

        // ✅ Step 2: Fetch Existing Video
        const video = await context.run("get-video", async () => {
            const [existingVideo] = await db
                .select()
                .from(videos)
                .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

            if (!existingVideo) {
                console.error("Video not found:", { videoId, userId });
                throw new Error("Video not found");
            }
            return existingVideo;
        });

        // ✅ Step 3: Generate Image Description using Gemini API
        const descriptionResponse = await context.run("generate-thumbnail", async () => {
            return fetchWithRetry(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: `Generate an image description for: ${prompt}` }] }],
                    generationConfig: { maxOutputTokens: 512 }
                })
            });
        });

        const imageDescription = descriptionResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!imageDescription) {
            throw new Error("Failed to generate image description");
        }
        console.log("Generated Image Description:", imageDescription);

        // ✅ Step 4: Generate Image using Gemini API
        const imageResponse = await context.run("generate-image", async () => {
            return fetchWithRetry(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: `Generate a high-quality image for: ${imageDescription}` }] }],
                    generationConfig: { maxOutputTokens: 512 }
                })
            });
        });

        const generatedImageUrl = imageResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!generatedImageUrl || !generatedImageUrl.startsWith("http")) {
            throw new Error("Invalid image URL received from Gemini API");
        }
        console.log("Generated Image URL:", generatedImageUrl);

        // ✅ Step 5: Upload Generated Image to UploadThing
        const uploadedThumbnail = await context.run("upload-thumbnail", async () => {
            const utapi = new UTApi();
            const { data, error } = await utapi.uploadFilesFromUrl(generatedImageUrl);

            if (error || !data) {
                throw new Error(`Thumbnail upload failed: ${error?.message || "Unknown error"}`);
            }
            return data;
        });

        console.log("Uploaded Thumbnail:", uploadedThumbnail);

        // ✅ Step 6: Update Video Record with New Thumbnail
        await context.run("update-video", async () => {
            await db
                .update(videos)
                .set({ thumbnailUrl: uploadedThumbnail.url })
                .where(and(eq(videos.id, videoId), eq(videos.userId, video.userId)));
        });

        // ✅ Step 7: Return Response
        context.response = new Response(JSON.stringify({ thumbnailUrl: uploadedThumbnail.url }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in workflow:", error);
        context.response = new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
