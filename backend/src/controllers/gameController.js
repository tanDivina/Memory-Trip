// src/controllers/gameController.js
const gemini = require('../services/geminiService');
const gameState = require('../services/gameStateManager');
const { AddedBy } = require('../shared/types');

// --- AI Handlers ---

exports.generateInitialImage = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
        const result = await gemini.generateImageFromText(prompt);
        res.json(result);
    } catch (error) {
        console.error('Error generating initial image:', error);
        res.status(500).json({ error: 'Failed to generate the initial scene.' });
    }
};

exports.editImage = async (req, res) => {
    try {
        const { currentImageBase64, mimeType, itemPrompt } = req.body;
        if (!currentImageBase64 || !mimeType || !itemPrompt) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        const result = await gemini.editImageWithText(currentImageBase64, mimeType, itemPrompt);
        res.json(result);
    } catch (error) {
        console.error('Error editing image:', error);
        res.status(500).json({ error: 'Failed to add item to the scene.' });
    }
};

exports.getAIIdea = async (req, res) => {
    try {
        const { persona, location, items } = req.body;
        const prompt = `You are a creative AI opponent in a memory game with the persona of "${persona}". The game is set in "${location}". The items added so far are: ${items.join(', ')}. Suggest one single, new, creative item to add to the scene. Be concise. Do not add any conversational text. Just the item name.`;
        const idea = await gemini.runTextPrompt(prompt);
        res.json({ idea: idea.replace(/["n.]/g, '').trim() });
    } catch (error) {
        console.error('Error getting AI idea:', error);
        res.status(500).json({ error: 'The AI is currently stumped.' });
    }
};

exports.getTripSummary = async (req, res) => {
    try {
        const { location, items } = req.body;
        const prompt = `Write a short, quirky, first-person travel journal entry (2-3 sentences) about a trip to "${location}" where the only things I packed or saw were: ${items.join(', ')}.`;
        const summary = await gemini.runTextPrompt(prompt);
        res.json({ summary });
    } catch (error) {
        console.error('Error getting trip summary:', error);
        res.status(500).json({ error: 'Could not generate trip summary.' });
    }
};

exports.validateMemory = async (req, res) => {
    try {
        const { recalledItems, actualItems } = req.body;
        const result = await gemini.validateMemoryAI(recalledItems, actualItems);
        res.json(result);
    } catch (error) {
        console.error('Error validating memory:', error);
        res.status(500).json({ error: 'Could not validate memory.' });
    }
};


// --- Online Game Handlers ---

const createPlayer = (name) => ({ id: `player_${Date.now()}_${Math.random()}`, name });

exports.createOnlineGame = (req, res) => {
    try {
        const { prompt, playerName } = req.body;
        const hostPlayer = createPlayer(playerName);
        const newGame = gameState.createGame(prompt, hostPlayer);
        res.json({
            gameCode: newGame.gameCode,
            playerId: hostPlayer.id,
            gameState: newGame
        });
    } catch (error) {
        console.error('Error creating online game:', error);
        res.status(500).json({ error: 'Could not create the game.' });
    }
};

exports.joinOnlineGame = (req, res) => {
    try {
        const { gameCode, playerName } = req.body;
        let game = gameState.getGame(gameCode);
        if (!game) return res.status(404).json({ error: 'Game not found.' });
        if (game.gameStatus !== 'lobby') return res.status(403).json({ error: 'Game has already started.' });
        if (game.players.length >= 4) return res.status(403).json({ error: 'Game is full.' });

        const newPlayer = createPlayer(playerName);
        game = gameState.addPlayer(gameCode, newPlayer);

        res.json({
            playerId: newPlayer.id,
            gameState: game
        });
    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ error: 'Could not join the game.' });
    }
};

exports.getGameState = (req, res) => {
    const { gameCode } = req.body;
    const game = gameState.getGame(gameCode);
    if (!game) return res.status(404).json({ error: 'Game not found.' });
    res.json({ gameState: game, gameStatus: game.gameStatus });
};

exports.startGame = async (req, res) => {
    try {
        const { gameCode, playerId } = req.body;
        let game = gameState.getGame(gameCode);
        if (game.hostId !== playerId) return res.status(403).json({ error: 'Only the host can start the game.' });

        // Generate the initial image for the online game
        const { base64Image, mimeType } = await gemini.generateImageFromText(game.basePrompt);

        const updates = {
            gameStatus: 'active',
            currentImage: base64Image,
            mimeType: mimeType,
            imageHistory: [base64Image],
            currentPlayerId: game.players[0].id,
            turnEndsAt: Date.now() + 60000
        };
        game = gameState.updateGame(gameCode, updates);
        res.json({ gameState: game });
    } catch (error) {
        console.error('Error starting game:', error);
        res.status(500).json({ error: 'Could not start the game.' });
    }
};

exports.submitOnlineTurn = async (req, res) => {
    try {
        const { gameCode, playerId, recalledItems, newItem } = req.body;
        let game = gameState.getGame(gameCode);
        if (game.currentPlayerId !== playerId) return res.status(403).json({ error: "It's not your turn." });

        const actualItems = game.items.map(i => i.text);
        const validation = await gemini.validateMemoryAI(recalledItems, actualItems);

        if (!validation.correct) {
            const updates = {
                gameStatus: 'finished',
                gameOverReason: `${game.players.find(p => p.id === playerId).name}'s memory failed!`
            };
            game = gameState.updateGame(gameCode, updates);
            return res.json({ gameState: game });
        }

        // Memory is correct, add the new item
        const { base64Image, mimeType } = await gemini.editImageWithText(game.currentImage, game.mimeType, newItem);

        const currentPlayerIndex = game.players.findIndex(p => p.id === playerId);
        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
        
        // Find which player enum this corresponds to (P1, P2, etc.)
        const addedByEnum = `PLAYER_${currentPlayerIndex + 1}`;

        const updates = {
            items: [...game.items, { text: newItem, addedBy: addedByEnum }],
            currentImage: base64Image,
            mimeType: mimeType,
            imageHistory: [...game.imageHistory, base64Image],
            currentPlayerId: game.players[nextPlayerIndex].id,
            turnEndsAt: Date.now() + 60000
        };
        game = gameState.updateGame(gameCode, updates);
        res.json({ gameState: game });

    } catch (error) {
        console.error('Error submitting turn:', error);
        res.status(500).json({ error: 'Could not submit your turn.' });
    }
};