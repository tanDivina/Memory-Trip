// backend/src/services/firestore.js
import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();
export const gamesCollection = firestore.collection('games');

/**
 * Gets a game document from Firestore.
 * @param {string} gameCode The game code.
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot>} The document snapshot.
 */
export const getGame = (gameCode) => {
    return gamesCollection.doc(gameCode).get();
};

/**
 * Creates a new game document in Firestore.
 * @param {string} gameCode The game code.
 * @param {object} initialGameState The initial state of the game.
 * @returns {Promise<FirebaseFirestore.WriteResult>}
 */
export const createGame = (gameCode, initialGameState) => {
    return gamesCollection.doc(gameCode).set(initialGameState);
};

/**
 * Updates a game document in Firestore.
 * @param {string} gameCode The game code.
 * @param {object} updates The updates to apply.
 * @returns {Promise<FirebaseFirestore.WriteResult>}
 */
export const updateGame = (gameCode, updates) => {
    return gamesCollection.doc(gameCode).update(updates);
};
