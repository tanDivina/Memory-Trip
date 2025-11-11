// src/routes/api.js
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// AI-powered creative routes
router.post('/generate-initial-image', gameController.generateInitialImage);
router.post('/edit-image', gameController.editImage);
router.post('/get-ai-idea', gameController.getAIIdea);
router.post('/get-trip-summary', gameController.getTripSummary);
router.post('/validate-memory', gameController.validateMemory);

// Online game state routes
router.post('/create-online-game', gameController.createOnlineGame);
router.post('/join-online-game', gameController.joinOnlineGame);
router.post('/get-game-state', gameController.getGameState);
router.post('/start-game', gameController.startGame);
router.post('/submit-turn', gameController.submitOnlineTurn);

module.exports = router;