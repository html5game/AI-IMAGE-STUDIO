import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalyzedPrompts } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Handles API errors, customizing messages for safety violations or API key issues.
 * @param error The error object from a catch block.
 * @throws An error with a user-friendly message.
 */
const handleApiError = (error: any): never => {
    let message = "An unknown error occurred.";

    // Extract message from various error structures
    if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    } else {
        // Try to stringify objects to find error codes/messages inside
         try {
            message = JSON.stringify(error);
         } catch (e) {
            message = String(error);
         }
    }

    const lowerMessage = message.toLowerCase();

    // Check for VEO API key specific error
    if (message.includes("Requested entity was not found.")) {
         throw new Error("Invalid API Key. Please select a valid API key to use the video generation feature.");
    }

    // Rate Limit / Quota Errors
    // Handles HTTP 429 and RESOURCE_EXHAUSTED responses often found in the JSON body
    if (
        lowerMessage.includes("429") || 
        lowerMessage.includes("quota") || 
        lowerMessage.includes("resource_exhausted") ||
        lowerMessage.includes("rate limit")
    ) {
        throw new Error("Usage limit exceeded. You have hit the API rate limit or quota. Please try again later.");
    }

    // Overloaded Errors
    if (lowerMessage.includes("503") || lowerMessage.includes("overloaded")) {
         throw new Error("The AI service is currently overloaded. Please try again in a moment.");
    }

    // Safety / Policy Violations
    // Capturing both SDK errors and our custom thrown errors
    const safetyKeywords = ['safety', 'blocked', 'policy', 'prompt was blocked', 'not allowed', 'safety filters'];
    if (safetyKeywords.some(keyword => lowerMessage.includes(keyword))) {
        throw new Error("The request was blocked by AI safety filters. Please try a different prompt or image.");
    }
    
    // Re-throw the original error message if it's not a handled issue.
    throw new Error(message);
};


/**
 * Generates an image from a text prompt using the imagen-4.0 model.
 * @param prompt The text prompt describing the image to generate.
 * @param aspectRatio The desired aspect ratio of the image.
 * @param numberOfImages The number of images to generate.
 * @returns A promise that resolves to an array of Base64 encoded strings of the generated images.
 */
export const generateImageFromText = async (prompt: string, aspectRatio: string, numberOfImages: number): Promise<string[]> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: numberOfImages,
              outputMimeType: 'image/png',
              aspectRatio: aspectRatio,
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages.map(img => img.image.imageBytes);
        } else {
             // For this model, an empty response is the primary indicator of a safety block.
            throw new Error("The prompt was blocked due to safety policies.");
        }
    } catch (error) {
        console.error("Error generating image from text:", error);
        handleApiError(error);
    }
};

interface ImageInput {
    base64: string;
    mimeType: string;
}

/**
 * Edits existing images based on a text prompt using the gemini-2.5-flash-image model.
 * @param prompt The text prompt describing the edits.
 * @param images An array of image objects, each with Base64 data and a MIME type.
 * @param numberOfImages The number of image variations to generate.
 * @returns A promise that resolves to an array of Base64 encoded strings of the edited images.
 */
export const editImageWithText = async (prompt: string, images: ImageInput[], numberOfImages: number): Promise<string[]> => {
    try {
        const imageParts = images.map(image => ({
            inlineData: {
                data: image.base64,
                mimeType: image.mimeType,
            },
        }));

        const systemPrompt = `
**PRIMARY OBJECTIVE: MULTI-CHARACTER CONSISTENCY**

You are an expert image composition AI. Your task is to create a new scene based on the user's text prompt, populating it with the EXACT individuals from the uploaded source images. This is a test of your ability to maintain the identity of multiple, distinct characters.

**CRITICAL RULES FOR CHARACTER FIDELITY:**

1.  **Assign and Isolate:**
    *   The first uploaded image contains **Character 1**.
    *   The second (and subsequent) uploaded image contains **Character 2** (and so on).
    *   You MUST treat each character as a separate, non-interchangeable entity.

2.  **Absolute Identity Preservation:**
    *   The face, hair, and all defining features of **Character 1** in the final image MUST be a perfect, 1:1 match to the person in the first source image.
    *   The face, hair, and all defining features of **Character 2** in the final image MUST be a perfect, 1:1 match to the person in the second source image.
    *   **FAILURE CONDITION:** Any deviation, blending of features, or generation of a new, unrecognized face is a complete failure of the task.

3.  **Execution Flow:**
    *   **Step 1:** Analyze and internally "store" the complete likeness of each character from their respective source images.
    *   **Step 2:** Generate the background, scene, and body poses based on the user's text prompt.
    *   **Step 3:** Composite the stored character likenesses (faces, etc.) onto the generated bodies in the scene. The integration must be seamless, but the identity preservation is the absolute priority.

**USER'S SCENE DESCRIPTION:**
${prompt}
`.trim();

        const generationPromises = Array.from({ length: numberOfImages }).map(() =>
            ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        ...imageParts,
                        { text: systemPrompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            }).then(response => {
                const candidate = response.candidates?.[0];
                const imagePart = candidate?.content?.parts?.find(part => part.inlineData);
                if (imagePart?.inlineData?.data) {
                    return imagePart.inlineData.data;
                }
                if (response.text) {
                    // If text is returned instead of an image, it might be an error or a refusal.
                    throw new Error(response.text);
                }
                throw new Error("The model did not return an image, which may be due to safety filters.");
            })
        );

        const imageResults = await Promise.all(generationPromises);

        if (imageResults.length === 0) {
            throw new Error("The model returned no images across all requests.");
        }

        return imageResults;

    } catch (error) {
        console.error("Error editing image with text:", error);
        handleApiError(error);
    }
};


/**
 * Superimposes a garment image onto a model image using a virtual try-on prompt.
 * @param prompt The user's prompt (can be empty).
 * @param modelImage The image of the person.
 * @param garmentImages An array of images of the clothing items/accessories.
 * @returns A promise that resolves to the Base64 encoded string of the resulting image.
 */
export const virtualTryOn = async (prompt: string, modelImage: ImageInput, garmentImages: ImageInput[]): Promise<string> => {
    try {
        const modelImagePart = {
            inlineData: {
                data: modelImage.base64,
                mimeType: modelImage.mimeType,
            },
        };
        const garmentImageParts = garmentImages.map(garment => ({
            inlineData: {
                data: garment.base64,
                mimeType: garment.mimeType,
            },
        }));

        const fullPrompt = `
**TASK: IMAGE COMPOSITION**

**Source Images:**
- The first image provided is the BASE image. It contains the model and background.
- The following image(s) are the GARMENT images. They contain the clothing items.

**Instructions:**
1.  Isolate the clothing from the GARMENT image(s).
2.  Superimpose the isolated clothing onto the model in the BASE image.
3.  **CRITICAL RULE:** The final output must be an **EDIT** of the BASE image. You are strictly forbidden from changing the model's face, hair, pose, body shape, or the original background.
4.  If a GARMENT image includes a person, you must ignore the person and use only their clothing.
5.  **User Guidance:** ${prompt || 'Apply the garments to the model.'}
`.trim();

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    modelImagePart,
                    ...garmentImageParts,
                    {
                        text: fullPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const candidate = response.candidates?.[0];

        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
        }
        
        if (response.text) {
            throw new Error(response.text);
        }
        
        throw new Error("The model did not return an image, which may be due to safety filters.");

    } catch (error) {
        console.error("Error performing virtual try-on:", error);
        handleApiError(error);
    }
};


/**
 * Analyzes an image to generate a simple and detailed text prompt using the gemini-3-pro-preview model.
 * @param prompt The user's query about the image.
 * @param imageBase64 The Base64 encoded string of the image to analyze.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to an object containing a simple and a detailed prompt.
 */
export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<AnalyzedPrompts> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: imageBase64,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        simplePrompt: {
                            type: Type.STRING,
                            description: "A concise, simple prompt that captures the main subject of the image.",
                        },
                        detailedPrompt: {
                            type: Type.STRING,
                            description: "A highly detailed, comprehensive, and descriptive prompt for an image generator to recreate the uploaded image with at least 90% similarity. Break down the visual elements meticulously. Include specifics on:\n- **Subject:** Detailed description of the person's facial features (eyes, nose, lips, face shape), and expression. For hair, be extremely specific about the style, color, length, and texture. Describe the pose.\n- **Attire:** A precise and objective description of all clothing and accessories. For garments, describe the **clothing itself**—its style (e.g., 'a red lace bralette'), neckline (e.g., 'with a triangle cut'), fabric (e.g., 'made of sheer lace'), and details (e.g., 'adorned with satin bows'). **AVOID** describing the wearer's body shape, anatomy, or using subjective or suggestive terms (e.g., 'prominent', 'voluptuous', 'revealing'). Focus strictly on the fashion elements.\n- **Setting/Background:** Detailed description of the environment.\n- **Lighting:** Describe the lighting style, mood, and direction.\n- **Composition:** Mention the camera angle, shot type, and aspect ratio.\n- **Style:** Specify the overall artistic style (e.g., photorealistic, hyper-realistic, fantasy art). If the user asks a general question, this field should contain the answer."
                        }
                    },
                    required: ['simplePrompt', 'detailedPrompt']
                }
            }
        });
        
        // If the model returns text, it could be a valid JSON or an error message.
        const responseText = response.text;
        if (!responseText) {
            throw new Error("The model returned an empty response, which may be due to safety filters.");
        }

        try {
            // Attempt to parse the text as JSON.
            const parsedResponse = JSON.parse(responseText);
             if (parsedResponse.simplePrompt && parsedResponse.detailedPrompt) {
                return parsedResponse;
            } else {
                throw new Error("Invalid response format from API. Expected 'simplePrompt' and 'detailedPrompt' fields.");
            }
        } catch (jsonError) {
            // If parsing fails, the text is likely an error/safety message from the model.
            throw new Error(responseText);
        }

    } catch (error) {
        console.error("Error analyzing image:", error);
        handleApiError(error);
    }
};

interface VideoGenerationOptions {
    prompt: string;
    aspectRatio: '16:9' | '9:16';
    resolution: '720p' | '1080p';
    image?: ImageInput;
    onStatusUpdate: (status: string) => void;
}

/**
 * Generates a video from a text prompt and/or an image using the Veo model.
 * @param options The generation options including prompt, aspect ratio, resolution, and an optional starting image.
 * @returns A promise that resolves to a blob URL of the generated video.
 */
export const generateVideo = async (options: VideoGenerationOptions): Promise<string> => {
    const { prompt, aspectRatio, resolution, image, onStatusUpdate } = options;
    try {
        // Create a new instance right before the call to ensure the latest selected API key is used.
        const veo_ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        onStatusUpdate("Initializing video generation...");
        
        const payload: any = {
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: resolution,
                aspectRatio: aspectRatio
            }
        };

        if (image) {
            payload.image = {
                imageBytes: image.base64,
                mimeType: image.mimeType,
            };
        }

        let operation = await veo_ai.models.generateVideos(payload);

        onStatusUpdate("Processing video... This may take a few minutes. Please wait.");
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            onStatusUpdate("Still processing... Thanks for your patience.");
            operation = await veo_ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was provided.");
        }

        onStatusUpdate("Finalizing video...");
        // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to download the video. Status: ${response.statusText}`);
        }
        
        onStatusUpdate("Done!");
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error("Error generating video:", error);
        handleApiError(error);
    }
};