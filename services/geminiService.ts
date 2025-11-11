const BACKEND_URL = 'https://backend-81532538916.us-central1.run.app';

// A helper to handle fetch requests and errors consistently
const fetchFromBackend = async (endpoint: string, body: object) => {
    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request to backend failed with status: ' + response.status }));
            throw new Error(errorData.error || 'An unknown error occurred with the backend server.');
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching from backend endpoint ${endpoint}:`, error);
        // Re-throw a user-friendly error
        if (error instanceof Error) {
            throw new Error(`Our server seems to be having trouble. Please try again later. (Details: ${error.message})`);
        }
        throw new Error("An unknown network error occurred.");
    }
};

export const generateInitialImage = async (prompt: string): Promise<{ base64Image: string, mimeType: string }> => {
    return fetchFromBackend('/generate-initial-image', { prompt });
};

export const editImage = async (currentImageBase64: string, mimeType: string, itemPrompt: string): Promise<{ base64Image: string, mimeType: string }> => {
    return fetchFromBackend('/edit-image', { 
        currentImageBase64,
        mimeType,
        itemPrompt,
    });
};

export const getAIIdea = async (persona: string, location: string, items: string[]): Promise<string> => {
   const data = await fetchFromBackend('/get-ai-idea', {
        persona,
        location,
        items,
   });
   return data.idea; // Assuming the backend returns { idea: "..." }
};

export const getTripSummary = async (location: string, items: string[]): Promise<string> => {
    const data = await fetchFromBackend('/get-trip-summary', {
        location,
        items,
    });
    return data.summary; // Assuming the backend returns { summary: "..." }
<<<<<<< HEAD
=======
};

export const validateMemory = async (recalledItems: string[], actualItems: string[]): Promise<{ correct: boolean }> => {
   return fetchFromBackend('/api/validate-memory', {
        recalledItems,
        actualItems,
   });
};

// --- Online Game Functions ---

export const createOnlineGame = async (prompt: string, playerName: string): Promise<{ gameCode: string, playerId: string, gameState: any }> => {
    return fetchFromBackend('/api/create-online-game', { prompt, playerName });
};

export const joinOnlineGame = async (gameCode: string, playerName: string): Promise<{ playerId: string, gameState: any }> => {
    return fetchFromBackend('/api/join-online-game', { gameCode, playerName });
};

export const getGameState = async (gameCode: string): Promise<{ gameState: any, gameStatus: string }> => {
    // Using GET for this would be more idiomatic, but sticking to POST for simplicity with the helper
    return fetchFromBackend('/api/get-game-state', { gameCode });
};

export const startGame = async (gameCode: string, playerId: string, prompt: string): Promise<{ gameState: any }> => {
    return fetchFromBackend('/api/start-game', { gameCode, playerId, prompt });
};

export const submitOnlineTurn = async (gameCode: string, playerId: string, recalledItems: string[], newItem: string): Promise<{ gameState: any }> => {
    return fetchFromBackend('/api/submit-turn', {
        gameCode,
        playerId,
        recalledItems,
        newItem
    });
>>>>>>> c5bed00711e83c06530a9a65cb9e1505fb6ee2bb
};