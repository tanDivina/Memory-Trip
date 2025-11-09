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

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});