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

const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";
const MAX_RETRIES = 5; // Increased from 3 to 5
const RETRY_DELAY = 2000; // Increased from 1000 to 2000 ms

// 🔹 Improved helper function
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = MAX_RETRIES
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Attempt ${i + 1}/${retries} for API request to ${url}`);
            const res = await fetch(url, options);

            if (res.ok) {
                const data = await res.json();
                console.log("API request successful");
                return data;
            }

            const errorText = await res.text();
            lastError = new Error(
                `API request failed (${res.status}): ${errorText.substring(0, 200)}`
            );

            if (res.status === 429 || res.status >= 500) {
                // Rate limit or server error - worth retrying
                const delay = RETRY_DELAY * Math.pow(2, i); // Exponential backoff
                console.log(`Retrying after ${delay}ms (status ${res.status})...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                // Client error (4xx) - not worth retrying except for 429
                console.error(
                    `Non-retryable error (${res.status}): ${errorText.substring(
                        0,
                        200
                    )}`
                );
                throw lastError;
            }
        } catch (error) {
            lastError =
                error instanceof Error ? error : new Error(String(error));
            console.error(`Fetch attempt ${i + 1} failed:`, lastError.message);

            // Wait before retrying
            const delay = RETRY_DELAY * Math.pow(2, i);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    // If we get here, all retries failed
    throw lastError || new Error("Max retries reached with unknown error");
}

export const { POST } = serve(async (context): Promise<void> => {
    try {
        // ✅ Step 1: Parse Input
        const { videoId, userId, prompt } = await context.run(
            "parse-input",
            async () => {
                const input = context.requestPayload as InputType;
                return input;
            }
        );

        // ✅ Step 2: Fetch Video
        const video = await context.run("get-video", async () => {
            const [existingVideo] = await db
                .select()
                .from(videos)
                .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

            if (!existingVideo) {
                throw new Error("Video not found");
            }
            return existingVideo;
        });

        // ✅ Step 3: Generate Image Description
        const descriptionResponse = await context.run(
            "generate-description",
            async () => {
                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) {
                    throw new Error("GEMINI_API_KEY is not configured");
                }

                return fetchWithRetry(
                    `${GEMINI_API_URL}?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "User-Agent": "NewTube/1.0", // Adding a user agent can help
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    role: "user",
                                    parts: [
                                        {
                                            text: `Generate a detailed image description for: ${prompt}`,
                                        },
                                    ],
                                },
                            ],
                            generationConfig: { maxOutputTokens: 512 },
                        }),
                    }
                );
            }
        );

        const imageDescription =
            descriptionResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!imageDescription) {
            context.response = new Response(
                JSON.stringify({ error: "Failed to generate image description" }),
                { status: 500 }
            );
            return;
        }

        // ✅ Step 4: Generate Image using Gemini
        const imageResponse = await context.run("generate-image", async () => {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("GEMINI_API_KEY is not configured");
            }

            return fetchWithRetry(
                `${GEMINI_API_URL}?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "NewTube/1.0",
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        text: `Generate a high-quality image for: ${imageDescription}`,
                                    },
                                ],
                            },
                        ],
                        generationConfig: { maxOutputTokens: 512 },
                    }),
                }
            );
        });

        const generatedImageUrl =
            imageResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedImageUrl || !generatedImageUrl.startsWith("http")) {
            context.response = new Response(
                JSON.stringify({ error: "Invalid image URL from Gemini" }),
                { status: 500 }
            );
            return;
        }

        // ✅ Step 5: Upload to UploadThing
        const uploadedThumbnail = await context.run("upload-thumbnail", async () => {
            const utapi = new UTApi();
            const { data, error } = await utapi.uploadFilesFromUrl(generatedImageUrl);
            if (error || !data) {
                throw new Error(`Thumbnail upload failed: ${error?.message}`);
            }
            return data;
        });

        // ✅ Step 6: Update video record
        await context.run("update-video", async () => {
            await db
                .update(videos)
                .set({ thumbnailUrl: uploadedThumbnail.url })
                .where(and(eq(videos.id, videoId), eq(videos.userId, video.userId)));
        });

        // ✅ Step 7: Send Response
        context.response = new Response(
            JSON.stringify({ thumbnailUrl: uploadedThumbnail.url }),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Workflow failed:", errorMessage);
        context.response = new Response(
            JSON.stringify({
                error: "Failed to generate thumbnail",
                details: errorMessage,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
});
