// src/services/gameStateManager.js
const { AddedBy } = require('../shared/types'); // We need to share the enums

// In-memory store for active games. Key is gameCode.
const games = {};

const generateUniqueCode = () => {
    let code;
    do {
        code = Math.random().toString(36).substring(2, 6).toUpperCase();
    } while (games[code]);
    return code;
};

const createGame = (prompt, hostPlayer) => {
    const gameCode = generateUniqueCode();
    games[gameCode] = {
        gameCode,
        basePrompt: prompt,
        items: [],
        players: [hostPlayer],
        hostId: hostPlayer.id,
        gameStatus: 'lobby',
        // other initial state...
    };
    return games[gameCode];
};

const getGame = (gameCode) => {
    return games[gameCode];
};

const addPlayer = (gameCode, player) => {
    const game = games[gameCode];
    if (!game || game.players.length >= 4) {
        return null; // Game not found or full
    }
    game.players.push(player);
    return game;
};

const updateGame = (gameCode, updates) => {
    if (!games[gameCode]) return null;
    games[gameCode] = { ...games[gameCode], ...updates };
    return games[gameCode];
};

// You will need to create a shared types file or redefine them here
// For simplicity, let's create a 'shared' folder.
// /src/shared/types.js
/*
module.exports.AddedBy = {
  PLAYER_1: 'PLAYER_1',
  PLAYER_2: 'PLAYER_2',
  PLAYER_3: 'PLAYER_3',
  PLAYER_4: 'PLAYER_4',
  AI: 'AI',
}
*/

module.exports = {
    createGame,
    getGame,
    addPlayer,
    updateGame,
};