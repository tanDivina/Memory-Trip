// backend/server.js
import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';
import cors from 'cors';
import 'dotenv/config'; // Loads variables from .env file

const app = express();
const port = process.env.PORT || 3001; // You can use any port that's not in use

// Middleware
app.use(cors()); // Allow requests from your frontend
app.use(express.json({ limit: '10mb' })); // To parse JSON request bodies and increase payload limit for images

// Initialize the Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- API PROXY ENDPOINTS ---

// Example: An endpoint to proxy the initial image generation
app.post('/api/generate-initial-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // This logic is moved from your frontend's geminiService.ts
        const descriptionPrompt = `Describe a specific, visually interesting, and real street-level scene from a Google Street View perspective in "${prompt}". Be very descriptive...`; // Keep your full prompt here
        const descriptionResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: descriptionPrompt,
        });
        const sceneDescription = descriptionResponse.text.trim();

        const imageGenerationPrompt = `A photorealistic, Google Street View style image of the following scene: ${sceneDescription}...`; // Keep your full prompt here
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imageGenerationPrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        
        const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
        if (!imagePart?.inlineData) throw new Error("API did not return an image.");

        // Send the successful response back to the frontend
        res.json({
            base64Image: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        });

    } catch (error) {
        console.error('Error in /api/generate-initial-image:', error);
        res.status(500).json({ error: 'Failed to generate initial image.' });
    }
});

// You would create similar endpoints for editImage, getAIIdea, etc.
app.post('/api/edit-image', async (req, res) => {
    try {
        const { currentImageBase64, mimeType, itemPrompt } = req.body;
        if (!currentImageBase64 || !mimeType || !itemPrompt) {
            return res.status(400).json({ error: 'currentImageBase64, mimeType, and itemPrompt are required' });
        }

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

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
        if (!imagePart?.inlineData) throw new Error("API did not return an image.");

        res.json({
            base64Image: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        });

    } catch (error) {
        console.error('Error in /api/edit-image:', error);
        res.status(500).json({ error: 'Failed to edit image.' });
    }
});

app.post('/api/validate-memory', async (req, res) => {
    try {
        const { recalledItems, actualItems } = req.body;
        if (!recalledItems || !actualItems) {
            return res.status(400).json({ error: 'recalledItems and actualItems are required' });
        }

        const prompt = `You are a judge in a memory game. A player was asked to recall a list of items.
The actual items are:
${JSON.stringify(actualItems)}

The player recalled:
${JSON.stringify(recalledItems)}

Are the recalled items semantically equivalent to the actual items? The order does not matter, and minor differences in wording are acceptable.
Respond with only a JSON object with a single key "correct" which is a boolean value (true or false).`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        // Basic parsing, assuming the model behaves and returns valid JSON.
        const result = JSON.parse(response.text.trim());
        res.json(result);

    } catch (error) {
        console.error('Error in /api/validate-memory:', error);
        res.status(500).json({ error: 'Failed to validate memory.' });
    }
});

app.post('/api/get-trip-summary', async (req, res) => {
    try {
        const { location, items } = req.body;
        if (!location || !items) {
            return res.status(400).json({ error: 'location and items are required' });
        }

        const itemList = items.length > 0 ? items.join(', ') : 'nothing at all';
        const prompt = `You are a travel blogger with a quirky sense of humor. Write a short, funny travel journal entry about a trip to "${location}". During the trip, the following items were bizarrely involved: ${itemList}. Keep the entry under 150 words. Be creative and weave the items into the story naturally.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        res.json({ summary: response.text.trim() });

    } catch (error) {
        console.error('Error in /api/get-trip-summary:', error);
        res.status(500).json({ error: 'Failed to generate trip summary.' });
    }
});

app.post('/api/get-ai-idea', async (req, res) => {
    try {
        const { persona, location, items } = req.body;
        if (!persona || !location || !items) {
            return res.status(400).json({ error: 'persona, location, and items are required' });
        }

        const itemList = items.length > 0 ? items.join(', ') : 'nothing yet';
        const prompt = `You are an AI player in a visual game. Your persona is "${persona}". The game is in "${location}". The scene already contains: ${itemList}. Based on your persona, what is the next single object you add? The object should be simple and easy to visualize. Be creative and stay in character. Respond with only the name of the object. Do not add any extra text or explanation.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        const idea = response.text.trim().replace(/["'.]/g, '');
        res.json({ idea: idea });

    } catch (error) {
        console.error('Error in /api/get-ai-idea:', error);
        res.status(500).json({ error: 'Failed to get AI idea.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});