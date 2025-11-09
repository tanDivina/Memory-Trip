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
};