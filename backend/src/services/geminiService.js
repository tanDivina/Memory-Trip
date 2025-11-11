// src/services/geminiService.js
const { GoogleGenAI, Modality, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// For image generation and editing
const imageModel = 'gemini-2.5-flash-image';
// For fast text-based tasks
const textModel = 'gemini-2.5-flash';

const generateImageFromText = async (prompt) => {
    const model = ai.getGenerativeModel({ model: imageModel });
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'image/jpeg' }, // Assuming JPEG for initial image
    });
    const response = result.response;
    if (!response || !response.candidates || response.candidates.length === 0) {
        throw new Error('Image generation failed: No candidates returned.');
    }
    const firstPart = response.candidates[0].content.parts[0];
    if (firstPart.inlineData) {
        return {
            base64Image: firstPart.inlineData.data,
            mimeType: firstPart.inlineData.mimeType,
        };
    }
    throw new Error('Image generation failed to return inline data.');
};

const editImageWithText = async (base64Image, mimeType, prompt) => {
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: {
            parts: [
                { inlineData: { data: base64Image, mimeType } },
                { text: prompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    });
    const firstPart = response.candidates[0].content.parts[0];
     if (firstPart.inlineData) {
        return {
            base64Image: firstPart.inlineData.data,
            mimeType: firstPart.inlineData.mimeType,
        };
    }
    throw new Error('Image editing failed to return inline data.');
};

const runTextPrompt = async (prompt) => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
    });
    return response.text;
};

const validateMemoryAI = async (recalledItems, actualItems) => {
    const prompt = `You are a strict memory game judge. Compare the user's recalled list with the actual list. The order must be exactly the same. Allow for very minor semantic differences (e.g., 'a hat' vs 'the hat'). Respond with only a JSON object: {"correct": true} or {"correct": false}.

Recalled List:
${JSON.stringify(recalledItems)}

Actual List:
${JSON.stringify(actualItems)}
`;
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    
    try {
        // The response text is a string that needs to be parsed into a JSON object.
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse memory validation JSON:", response.text);
        // Fallback to a simple check if AI response is malformed
        return { correct: JSON.stringify(recalledItems) === JSON.stringify(actualItems) };
    }
};


module.exports = {
    generateImageFromText,
    editImageWithText,
    runTextPrompt,
    validateMemoryAI,
};