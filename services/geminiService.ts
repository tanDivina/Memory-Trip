
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const getImagePart = (response: GenerateContentResponse) => {
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (part) => !!part.inlineData
    );
    if (!imagePart?.inlineData) {
        throw new Error("No image data found in the API response.");
    }
    return {
        base64Image: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
    };
};

export const generateInitialImage = async (prompt: string): Promise<{ base64Image: string, mimeType: string }> => {
    try {
        // Step 1: Generate a detailed description of a real scene.
        const descriptionPrompt = `Describe a specific, visually interesting, and real street-level scene from a Google Street View perspective in "${prompt}". Be very descriptive about the architecture, street signs, plants, time of day, and overall atmosphere. This description will be used to generate a photorealistic image. Focus on concrete visual details.`;

        const descriptionResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: descriptionPrompt,
        });
        const sceneDescription = descriptionResponse.text.trim();

        // Step 2: Generate an image from that detailed description.
        const imageGenerationPrompt = `A photorealistic, Google Street View style image of the following scene: ${sceneDescription}. The image must look like a real photograph from a car-mounted camera, including realistic lighting and textures. Do not include any text overlays on the image itself.`;

        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: imageGenerationPrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        return getImagePart(imageResponse);
    } catch (error) {
        console.error("Error generating initial image:", error);
        throw new Error("Gemini API call failed for initial image generation.");
    }
};

export const editImage = async (currentImageBase64: string, mimeType: string, itemPrompt: string): Promise<{ base64Image: string, mimeType: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: currentImageBase64,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: `Seamlessly and photorealistically add "${itemPrompt}" to the image. Maintain the existing art style and composition.`,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        return getImagePart(response);
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Gemini API call failed for image editing.");
    }
};

export const getAIIdea = async (persona: string, location: string, items: string[]): Promise<string> => {
    /**
     * Example prompt for the LLM:
     * 'You are an AI player in a visual game. Your persona is "{persona}".
     * The game is in "{location}". The scene already contains: {items}.
     * Based on your persona, what is the next single object you add? The object should be simple and easy to visualize.
     * Be creative and stay in character.
     * Respond with only the name of the object. Do not add any extra text or explanation.'
    */
   const itemList = items.length > 0 ? items.join(', ') : 'nothing yet';
   const prompt = `You are an AI player in a visual game. Your persona is "${persona}". The game is in "${location}". The scene already contains: ${itemList}. Based on your persona, what is the next single object you add? The object should be simple and easy to visualize. Be creative and stay in character. Respond with only the name of the object. Do not add any extra text or explanation.`;

   try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        const idea = response.text.trim();
        // Simple sanitization to remove potential quotes or weird formatting from the LLM
        return idea.replace(/["'.]/g, '');
    } catch (error) {
        console.error("Error getting AI idea:", error);
        throw new Error("Gemini API call failed for getting AI idea.");
    }
};

export const getTripSummary = async (location: string, items: string[]): Promise<string> => {
    const itemList = items.length > 0 ? items.join(', ') : 'nothing at all';
    const prompt = `You are a travel blogger with a quirky sense of humor. Write a short, funny travel journal entry about a trip to "${location}". During the trip, the following items were bizarrely involved: ${itemList}. Keep the entry under 150 words. Be creative and weave the items into the story naturally.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating trip summary:", error);
        throw new Error("Gemini API call failed for generating trip summary.");
    }
};
