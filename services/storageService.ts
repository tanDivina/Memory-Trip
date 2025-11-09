import { StoredTrip } from '../types';

const TRIPS_STORAGE_KEY = 'memory-trip-gallery';
const MAX_TRIPS = 20; // Limit to not bloat local storage

export const getTrips = (): StoredTrip[] => {
    try {
        const tripsJson = localStorage.getItem(TRIPS_STORAGE_KEY);
        if (!tripsJson) return [];
        const trips = JSON.parse(tripsJson) as StoredTrip[];
        return trips.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Failed to retrieve trips from local storage", error);
        return [];
    }
};

export const saveTrip = (tripData: Omit<StoredTrip, 'id' | 'timestamp'>): void => {
    try {
        const existingTrips = getTrips();
        const newTrip: StoredTrip = {
            ...tripData,
            id: `trip-${Date.now()}`,
            timestamp: Date.now(),
        };
        // Add the new trip and limit the total number of saved trips
        const updatedTrips = [newTrip, ...existingTrips].slice(0, MAX_TRIPS);
        localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updatedTrips));
    } catch (error) {
        console.error("Failed to save trip to local storage", error);
    }
};

export const deleteTrip = (tripId: string): void => {
    try {
        const existingTrips = getTrips();
        const updatedTrips = existingTrips.filter(trip => trip.id !== tripId);
        localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updatedTrips));
    } catch (error) {
        console.error("Failed to delete trip from local storage", error);
    }
};
