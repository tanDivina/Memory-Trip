// backend/src/routes/localGameRoutes.js
import { Router } from 'express';
import {
    generateInitialImage,
    editImage,
    validateMemory,
    getTripSummary,
    getAIIdea
} from '../controllers/localGameController.js';

const router = Router();

router.post('/generate-initial-image', generateInitialImage);
router.post('/edit-image', editImage);
router.post('/validate-memory', validateMemory);
router.post('/get-trip-summary', getTripSummary);
router.post('/get-ai-idea', getAIIdea);

export default router;
