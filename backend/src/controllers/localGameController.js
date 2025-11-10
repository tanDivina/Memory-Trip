// backend/src/controllers/localGameController.js
import { generateText, generateImage, editImageWithModel } from '../services/googleAI.js';
import { logger } from '../utils/logger.js';

export const generateInitialImage = async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const descriptionPrompt = `Describe a specific, visually interesting, and real street-level scene from a Google Street View perspective in "${prompt}". Be very descriptive...`;
        const sceneDescription = await generateText('gemini-2.5-pro', descriptionPrompt);

        const imageGenerationPrompt = `A photorealistic, Google Street View style image of the following scene: ${sceneDescription}...`;
        const { base64Image, mimeType } = await generateImage('gemini-2.5-flash-image', imageGenerationPrompt);

        res.json({ base64Image, mimeType });
    } catch (error) {
        logger.error({ message: 'Error in generateInitialImage', error: error.message, stack: error.stack });
        next(error);
    }
};

export const editImage = async (req, res, next) => {
    try {
        const { currentImageBase64, mimeType, itemPrompt } = req.body;
        if (!currentImageBase64 || !mimeType || !itemPrompt) {
            return res.status(400).json({ error: 'currentImageBase64, mimeType, and itemPrompt are required' });
        }

        const { base64Image, mimeType: newMimeType } = await editImageWithModel('gemini-2.5-flash-image', currentImageBase64, mimeType, `Seamlessly and photorealistically add "${itemPrompt}" to the image. Maintain the existing art style and composition.`);

        res.json({ base64Image, mimeType: newMimeType });
    } catch (error) {
        logger.error({ message: 'Error in editImage', error: error.message, stack: error.stack });
        next(error);
    }
};

export const validateMemory = async (req, res, next) => {
    try {
        const { recalledItems, actualItems } = req.body;
        if (!recalledItems || !actualItems) {
            return res.status(400).json({ error: 'recalledItems and actualItems are required' });
        }

        const prompt = `You are a judge in a memory game. A player was asked to recall a list of items. The actual items are: ${JSON.stringify(actualItems)}. The player recalled: ${JSON.stringify(recalledItems)}. Are the recalled items semantically equivalent to the actual items? The order does not matter, and minor differences in wording are acceptable. Respond with only a JSON object with a single key "correct" which is a boolean value (true or false).`;
        const resultText = await generateText('gemini-2.5-pro', prompt);
        const result = JSON.parse(resultText);
        res.json(result);
    } catch (error) {
        logger.error({ message: 'Error in validateMemory', error: error.message, stack: error.stack });
        next(error);
    }
};

export const getTripSummary = async (req, res, next) => {
    try {
        const { location, items } = req.body;
        if (!location || !items) {
            return res.status(400).json({ error: 'location and items are required' });
        }
        const itemList = items.length > 0 ? items.join(', ') : 'nothing at all';
        const prompt = `You are a travel blogger with a quirky sense of humor. Write a short, funny travel journal entry about a trip to "${location}". During the trip, the following items were bizarrely involved: ${itemList}. Keep the entry under 150 words. Be creative and weave the items into the story naturally.`;
        const summary = await generateText('gemini-2.5-pro', prompt);
        res.json({ summary });
    } catch (error) {
        logger.error({ message: 'Error in getTripSummary', error: error.message, stack: error.stack });
        next(error);
    }
};

export const getAIIdea = async (req, res, next) => {
    try {
        const { persona, location, items } = req.body;
        if (!persona || !location || !items) {
            return res.status(400).json({ error: 'persona, location, and items are required' });
        }
        const itemList = items.length > 0 ? items.join(', ') : 'nothing yet';
        const prompt = `You are an AI player in a visual game. Your persona is "${persona}". The game is in "${location}". The scene already contains: ${itemList}. Based on your persona, what is the next single object you add? The object should be simple and easy to visualize. Be creative and stay in character. Respond with only the name of the object. Do not add any extra text or explanation.`;
        const idea = await generateText('gemini-2.5-pro', prompt);
        res.json({ idea: idea.replace(/["'.]/g, '') });
    } catch (error) {
        logger.error({ message: 'Error in getAIIdea', error: error.message, stack: error.stack });
        next(error);
    }
};
