// backend/src/utils/logger.js
const log = (level, message) => {
    console.log(JSON.stringify({
        severity: level,
        message: message,
        timestamp: new Date().toISOString()
    }));
};

export const logger = {
    info: (message) => log('INFO', message),
    error: (message) => log('ERROR', message)
};
