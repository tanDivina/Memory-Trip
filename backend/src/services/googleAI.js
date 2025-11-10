// backend/src/services/googleAI.js
import { GoogleGenAI, Modality } from '@google/genai';
import 'dotenv/config';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates content using a Gemini model.
 * @param {string} model The name of the model to use.
 * @param {string} prompt The prompt for the model.
 * @returns {Promise<string>} The generated text.
 */
export const generateText = async (model, prompt) => {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text.trim();
};

/**
 * Generates an image using a Gemini model.
 * @param {string} model The name of the model to use.
 * @param {string} prompt The prompt for image generation.
 * @returns {Promise<{base64Image: string, mimeType: string}>} The generated image data.
 */
export const generateImage = async (model, prompt) => {
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
    if (!imagePart?.inlineData) throw new Error("API did not return an image.");

    return { base64Image: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
};

/**
 * Edits an image using a Gemini model.
 * @param {string} model The name of the model to use.
 * @param {string} imageBase64 The base64 encoded image.
 * @param {string} mimeType The mime type of the image.
 * @param {string} prompt The prompt for the edit.
 * @returns {Promise<{base64Image: string, mimeType: string}>} The edited image data.
 */
export const editImageWithModel = async (model, imageBase64, mimeType, prompt) => {
    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType: mimeType } },
                { text: prompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
    if (!imagePart?.inlineData) throw new Error("API did not return an image.");

    return { base64Image: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
};
