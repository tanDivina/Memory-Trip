// backend/server.js
import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';
import { Firestore } from '@google-cloud/firestore';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize clients
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const firestore = new Firestore();
const gamesCollection = firestore.collection('games');

// --- Helper Functions ---
const generateGameCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

// --- Local Game Endpoints ---

app.post('/api/generate-initial-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const descriptionPrompt = `Describe a specific, visually interesting, and real street-level scene from a Google Street View perspective in "${prompt}". Be very descriptive...`;
        const descriptionResponse = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: descriptionPrompt });
        const sceneDescription = descriptionResponse.text.trim();

        const imageGenerationPrompt = `A photorealistic, Google Street View style image of the following scene: ${sceneDescription}...`;
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imageGenerationPrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
        if (!imagePart?.inlineData) throw new Error("API did not return an image.");

        res.json({ base64Image: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
    } catch (error) {
        console.error('Error in /api/generate-initial-image:', error);
        res.status(500).json({ error: 'Failed to generate initial image.' });
    }
});

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
                    { inlineData: { data: currentImageBase64, mimeType: mimeType } },
                    { text: `Seamlessly and photorealistically add "${itemPrompt}" to the image. Maintain the existing art style and composition.` },
                ],
            },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
        if (!imagePart?.inlineData) throw new Error("API did not return an image.");

        res.json({ base64Image: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
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

        const prompt = `You are a judge in a memory game. A player was asked to recall a list of items. The actual items are: ${JSON.stringify(actualItems)}. The player recalled: ${JSON.stringify(recalledItems)}. Are the recalled items semantically equivalent to the actual items? The order does not matter, and minor differences in wording are acceptable. Respond with only a JSON object with a single key "correct" which is a boolean value (true or false).`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
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
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
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
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
        const idea = response.text.trim().replace(/["'.]/g, '');
        res.json({ idea: idea });
    } catch (error) {
        console.error('Error in /api/get-ai-idea:', error);
        res.status(500).json({ error: 'Failed to get AI idea.' });
    }
});


// --- Online Game Endpoints ---

app.post('/api/create-online-game', async (req, res) => {
    try {
        const { prompt, playerName } = req.body;
        if (!prompt || !playerName) return res.status(400).json({ error: 'Prompt and playerName are required' });

        const gameCode = generateGameCode();
        const hostId = Math.random().toString(36).substring(2, 15);

        const initialGameState = {
            gameCode,
            basePrompt: prompt,
            gameStatus: 'lobby',
            hostId,
            players: [{ id: hostId, name: playerName, score: 0 }],
            items: [],
            currentImage: null,
            mimeType: null,
            currentPlayerId: hostId,
            turnEndsAt: null,
            gameoverReason: null,
        };

        await gamesCollection.doc(gameCode).set(initialGameState);

        res.status(201).json({ playerId: hostId, gameState: initialGameState });
    } catch (error) {
        console.error('Error in /api/create-online-game:', error);
        res.status(500).json({ error: 'Failed to create online game.' });
    }
});

app.post('/api/join-online-game', async (req, res) => {
    try {
        const { gameCode, playerName } = req.body;
        if (!gameCode || !playerName) return res.status(400).json({ error: 'Game code and player name are required' });

        const gameRef = gamesCollection.doc(gameCode);
        const gameDoc = await gameRef.get();

        if (!gameDoc.exists) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const gameData = gameDoc.data();
        if (gameData.players.length >= 4) {
            return res.status(400).json({ error: 'Game is full' });
        }

        const newPlayerId = Math.random().toString(36).substring(2, 15);
        const newPlayer = { id: newPlayerId, name: playerName, score: 0 };

        await gameRef.update({
            players: Firestore.FieldValue.arrayUnion(newPlayer)
        });
        
        const updatedGameDoc = await gameRef.get();
        const updatedGameState = updatedGameDoc.data();

        res.status(200).json({ playerId: newPlayerId, gameState: updatedGameState });
    } catch (error) {
        console.error('Error in /api/join-online-game:', error);
        res.status(500).json({ error: 'Failed to join game.' });
    }
});

app.post('/api/get-game-state', async (req, res) => {
    try {
        const { gameCode } = req.body;
        if (!gameCode) return res.status(400).json({ error: 'Game code is required' });

        const gameDoc = await gamesCollection.doc(gameCode).get();
        if (!gameDoc.exists) return res.status(404).json({ error: 'Game not found' });
        
        res.status(200).json({ gameState: gameDoc.data(), gameStatus: gameDoc.data().gameStatus });
    } catch (error) {
        console.error('Error in /api/get-game-state:', error);
        res.status(500).json({ error: 'Failed to get game state.' });
    }
});

app.post('/api/start-game', async (req, res) => {
    try {
        const { gameCode, playerId } = req.body;
        if (!gameCode || !playerId) return res.status(400).json({ error: 'Game code and player ID are required' });

        const gameRef = gamesCollection.doc(gameCode);
        const gameDoc = await gameRef.get();
        if (!gameDoc.exists) return res.status(404).json({ error: 'Game not found' });

        const gameData = gameDoc.data();
        if (gameData.hostId !== playerId) return res.status(403).json({ error: 'Only the host can start the game' });
        if (gameData.gameStatus !== 'lobby') return res.status(400).json({ error: 'Game has already started' });

        // Generate initial image
        const descriptionPrompt = `Describe a specific, visually interesting, and real street-level scene from a Google Street View perspective in "${gameData.basePrompt}". Be very descriptive...`;
        const descriptionResponse = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: descriptionPrompt });
        const sceneDescription = descriptionResponse.text.trim();
        const imageGenerationPrompt = `A photorealistic, Google Street View style image of the following scene: ${sceneDescription}...`;
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imageGenerationPrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
        if (!imagePart?.inlineData) throw new Error("API did not return an image.");

        await gameRef.update({
            gameStatus: 'active',
            currentImage: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
            turnEndsAt: Date.now() + 60000, // 60 seconds per turn
        });

        res.status(200).send();
    } catch (error) {
        console.error('Error in /api/start-game:', error);
        res.status(500).json({ error: 'Failed to start game.' });
    }
});

app.post('/api/submit-turn', async (req, res) => {
    try {
        const { gameCode, playerId, recalledItems, newItem } = req.body;
        if (!gameCode || !playerId || !newItem) return res.status(400).json({ error: 'Game code, player ID, and new item are required' });

        const gameRef = gamesCollection.doc(gameCode);
        const gameDoc = await gameRef.get();
        if (!gameDoc.exists) return res.status(404).json({ error: 'Game not found' });

        let gameData = gameDoc.data();
        if (gameData.gameStatus !== 'active') return res.status(400).json({ error: 'Game is not active' });
        if (gameData.currentPlayerId !== playerId) return res.status(400).json({ error: "It's not your turn" });

        // 1. Validate Memory
        const actualItems = gameData.items.map(i => i.text);
        if (recalledItems.length !== actualItems.length || !recalledItems.every((item, index) => item.toLowerCase() === actualItems[index].toLowerCase())) {
            await gameRef.update({ gameStatus: 'finished', gameoverReason: `${gameData.players.find(p=>p.id === playerId).name}'s memory failed!` });
            return res.status(200).send();
        }

        // 2. Add new item
        const editResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: gameData.currentImage, mimeType: gameData.mimeType } },
                    { text: `Seamlessly and photorealistically add "${newItem}" to the image. Maintain the existing art style and composition.` },
                ],
            },
            config: { responseModalities: [Modality.IMAGE] },
        });
        const imagePart = editResponse.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
        if (!imagePart?.inlineData) throw new Error("API did not return an image on edit.");

        // 3. Determine next player
        const currentPlayerIndex = gameData.players.findIndex(p => p.id === playerId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % gameData.players.length;
        const nextPlayerId = gameData.players[nextPlayerIndex].id;

        // 4. Update game state
        await gameRef.update({
            items: Firestore.FieldValue.arrayUnion({ text: newItem, addedBy: playerId }),
            currentImage: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
            currentPlayerId: nextPlayerId,
            turnEndsAt: Date.now() + 60000,
        });

        res.status(200).send();
    } catch (error) {
        console.error('Error in /api/submit-turn:', error);
        res.status(500).json({ error: 'Failed to submit turn.' });
    }
});


app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
