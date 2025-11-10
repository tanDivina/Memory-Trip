// backend/src/utils/gameUtils.js
/**
 * Generates a random 4-character game code.
 * @returns {string} The generated game code.
 */
export const generateGameCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};
