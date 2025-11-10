// backend/src/controllers/onlineGameController.js
import { Firestore } from '@google-cloud/firestore';
import { generateGameCode } from '../utils/gameUtils.js';
import { generateText, generateImage, editImageWithModel } from '../services/googleAI.js';
import { getGame, createGame, updateGame } from '../services/firestore.js';
import { logger } from '../utils/logger.js';

export const createOnlineGame = async (req, res, next) => {
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

        await createGame(gameCode, initialGameState);

        res.status(201).json({ playerId: hostId, gameState: initialGameState });
    } catch (error) {
        logger.error({ message: 'Error in createOnlineGame', error: error.message, stack: error.stack });
        next(error);
    }
};

export const joinOnlineGame = async (req, res, next) => {
    try {
        const { gameCode, playerName } = req.body;
        if (!gameCode || !playerName) return res.status(400).json({ error: 'Game code and player name are required' });

        const gameDoc = await getGame(gameCode);

        if (!gameDoc.exists) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const gameData = gameDoc.data();
        if (gameData.players.length >= 4) {
            return res.status(400).json({ error: 'Game is full' });
        }

        const newPlayerId = Math.random().toString(36).substring(2, 15);
        const newPlayer = { id: newPlayerId, name: playerName, score: 0 };

        await updateGame(gameCode, {
            players: Firestore.FieldValue.arrayUnion(newPlayer)
        });

        const updatedGameDoc = await getGame(gameCode);
        const updatedGameState = updatedGameDoc.data();

        res.status(200).json({ playerId: newPlayerId, gameState: updatedGameState });
    } catch (error) {
        logger.error({ message: 'Error in joinOnlineGame', error: error.message, stack: error.stack });
        next(error);
    }
};

export const getGameState = async (req, res, next) => {
    try {
        const { gameCode } = req.body;
        if (!gameCode) return res.status(400).json({ error: 'Game code is required' });

        const gameDoc = await getGame(gameCode);
        if (!gameDoc.exists) return res.status(404).json({ error: 'Game not found' });

        res.status(200).json({ gameState: gameDoc.data(), gameStatus: gameDoc.data().gameStatus });
    } catch (error) {
        logger.error({ message: 'Error in getGameState', error: error.message, stack: error.stack });
        next(error);
    }
};

export const startGame = async (req, res, next) => {
    try {
        const { gameCode, playerId } = req.body;
        if (!gameCode || !playerId) return res.status(400).json({ error: 'Game code and player ID are required' });

        const gameDoc = await getGame(gameCode);
        if (!gameDoc.exists) return res.status(404).json({ error: 'Game not found' });

        const gameData = gameDoc.data();
        if (gameData.hostId !== playerId) return res.status(403).json({ error: 'Only the host can start the game' });
        if (gameData.gameStatus !== 'lobby') return res.status(400).json({ error: 'Game has already started' });

        const descriptionPrompt = `Describe a specific, visually interesting, and real street-level scene from a Google Street View perspective in "${gameData.basePrompt}". Be very descriptive...`;
        const sceneDescription = await generateText('gemini-2.5-pro', descriptionPrompt);
        const imageGenerationPrompt = `A photorealistic, Google Street View style image of the following scene: ${sceneDescription}...`;
        const { base64Image, mimeType } = await generateImage('gemini-2.5-flash-image', imageGenerationPrompt);

        await updateGame(gameCode, {
            gameStatus: 'active',
            currentImage: base64Image,
            mimeType,
            turnEndsAt: Date.now() + 60000,
        });

        res.status(200).send();
    } catch (error) {
        logger.error({ message: 'Error in startGame', error: error.message, stack: error.stack });
        next(error);
    }
};

export const submitTurn = async (req, res, next) => {
    try {
        const { gameCode, playerId, recalledItems, newItem } = req.body;
        if (!gameCode || !playerId || !newItem) return res.status(400).json({ error: 'Game code, player ID, and new item are required' });

        const gameDoc = await getGame(gameCode);
        if (!gameDoc.exists) return res.status(404).json({ error: 'Game not found' });

        let gameData = gameDoc.data();
        if (gameData.gameStatus !== 'active') return res.status(400).json({ error: 'Game is not active' });
        if (gameData.currentPlayerId !== playerId) return res.status(400).json({ error: "It's not your turn" });

        const actualItems = gameData.items.map(i => i.text);
        if (recalledItems.length !== actualItems.length || !recalledItems.every((item, index) => item.toLowerCase() === actualItems[index].toLowerCase())) {
            await updateGame(gameCode, { gameStatus: 'finished', gameoverReason: `${gameData.players.find(p=>p.id === playerId).name}'s memory failed!` });
            return res.status(200).send();
        }

        const { base64Image, mimeType } = await editImageWithModel('gemini-2.5-flash-image', gameData.currentImage, gameData.mimeType, `Seamlessly and photorealistically add "${newItem}" to the image. Maintain the existing art style and composition.`);

        const currentPlayerIndex = gameData.players.findIndex(p => p.id === playerId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % gameData.players.length;
        const nextPlayerId = gameData.players[nextPlayerIndex].id;

        await updateGame(gameCode, {
            items: Firestore.FieldValue.arrayUnion({ text: newItem, addedBy: playerId }),
            currentImage: base64Image,
            mimeType,
            currentPlayerId: nextPlayerId,
            turnEndsAt: Date.now() + 60000,
        });

        res.status(200).send();
    } catch (error) {
        logger.error({ message: 'Error in submitTurn', error: error.message, stack: error.stack });
        next(error);
    }
};
