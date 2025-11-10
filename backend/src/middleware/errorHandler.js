// backend/src/middleware/errorHandler.js
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
    logger.error({
        message: 'An unexpected error occurred',
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method
    });
    res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
};
