const BACKEND_URL = 'https://backend-81532538916.us-central1.run.app';

// A helper to handle fetch requests and errors consistently
const fetchFromBackend = async (endpoint: string, body: object) => {
    // Let errors from fetch (like network errors) and non-ok responses 
    // propagate to the calling function's try/catch block.
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        // Try to parse the error message from the backend
        const errorData = await response.json().catch(() => ({ 
            error: 'Request to backend failed with status: ' + response.status 
        }));
        // Throw an error with the specific message from the backend
        throw new Error(errorData.error || 'An unknown error occurred with the backend server.');
    }

    // If response is OK, parse and return the JSON data
    return await response.json();
};

export const generateInitialImage = async (prompt: string): Promise<{ base64Image: string, mimeType: string }> => {
    return fetchFromBackend('/api/generate-initial-image', { prompt });
};

export const editImage = async (currentImageBase64: string, mimeType: string, itemPrompt: string): Promise<{ base64Image: string, mimeType: string }> => {
    return fetchFromBackend('/api/edit-image', { 
        currentImageBase64,
        mimeType,
        itemPrompt,
    });
};

export const getAIIdea = async (persona: string, location: string, items: string[]): Promise<string> => {
   const data = await fetchFromBackend('/api/get-ai-idea', {
        persona,
        location,
        items,
   });
   return data.idea; // Assuming the backend returns { idea: "..." }
};

export const getTripSummary = async (location: string, items: string[]): Promise<string> => {
    const data = await fetchFromBackend('/api/get-trip-summary', {
        location,
        items,
    });
    return data.summary; // Assuming the backend returns { summary: "..." }
};

export const validateMemory = async (recalledItems: string[], actualItems: string[]): Promise<{ correct: boolean }> => {
   return fetchFromBackend('/api/validate-memory', {
        recalledItems,
        actualItems,
   });
};