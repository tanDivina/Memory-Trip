// backend/src/routes/onlineGameRoutes.js
import { Router } from 'express';
import {
    createOnlineGame,
    joinOnlineGame,
    getGameState,
    startGame,
    submitTurn
} from '../controllers/onlineGameController.js';

const router = Router();

router.post('/create-online-game', createOnlineGame);
router.post('/join-online-game', joinOnlineGame);
router.post('/get-game-state', getGameState);
router.post('/start-game', startGame);
router.post('/submit-turn', submitTurn);

export default router;
