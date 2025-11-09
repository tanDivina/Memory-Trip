import React, { useState, useEffect } from 'react';
import { StoredTrip } from '../types';
import { getTrips, deleteTrip } from '../services/storageService';
import Button from './Button';
import Card from './Card';
import GalleryDetailModal from './GalleryDetailModal';
import ConfirmationModal from './ConfirmationModal';

interface GalleryScreenProps {
  onBack: () => void;
}

const GalleryScreen: React.FC<GalleryScreenProps> = ({ onBack }) => {
  const [trips, setTrips] = useState<StoredTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<StoredTrip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<StoredTrip | null>(null);

  useEffect(() => {
    setTrips(getTrips());
  }, []);
  
  const openDeleteConfirmation = (trip: StoredTrip, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the detail modal from opening
    setTripToDelete(trip);
  };

  const handleConfirmDelete = () => {
    if (!tripToDelete) return;

    deleteTrip(tripToDelete.id);
    setTrips(prevTrips => prevTrips.filter(t => t.id !== tripToDelete.id));
    setTripToDelete(null);
  };


  return (
    <div className="w-full max-w-5xl animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-4xl font-bold font-display text-brand-text">Trip Gallery</h2>
            <Button onClick={onBack} variant="secondary">Back to Menu</Button>
        </div>

        {trips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {trips.map(trip => (
                    <div
                        key={trip.id}
                        onClick={() => setSelectedTrip(trip)}
                        className="bg-brand-surface rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer flex overflow-hidden group"
                    >
                        <div className="w-1/3 flex-shrink-0">
                            <img
                                src={`data:${trip.mimeType};base64,${trip.finalImage}`}
                                alt={trip.location}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="p-4 flex flex-col w-2/3">
                            <div>
                                <p className="text-xs text-brand-text-muted">{new Date(trip.timestamp).toLocaleDateString()}</p>
                                <h3 className="text-lg font-bold font-display truncate text-brand-text leading-tight mt-1">{trip.location}</h3>
                                <p className="text-sm text-brand-text-muted mt-2 clamp-3-lines h-16">{trip.summary}</p>
                            </div>
                            <div className="mt-auto pt-2 flex justify-between items-center">
                                <p className="text-xs font-semibold text-brand-secondary">{trip.items.length} {trip.items.length === 1 ? 'item' : 'items'} added</p>
                                <button
                                    onClick={(e) => openDeleteConfirmation(trip, e)}
                                    className="p-1.5 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    aria-label={`Delete trip to ${trip.location}`}
                                    title="Delete Trip"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <Card className="text-center p-8">
                <h3 className="text-2xl font-bold font-display mb-2">Your Gallery is Empty</h3>
                <p className="text-brand-text-muted mb-6">Complete a game to save a postcard of your trip here!</p>
                <Button onClick={onBack}>Start a New Trip</Button>
            </Card>
        )}

        {selectedTrip && (
            <GalleryDetailModal
                trip={selectedTrip}
                onClose={() => setSelectedTrip(null)}
            />
        )}
        
        <ConfirmationModal
            isOpen={!!tripToDelete}
            onClose={() => setTripToDelete(null)}
            onConfirm={handleConfirmDelete}
            title="Confirm Deletion"
            message={`Are you sure you want to delete your trip to "${tripToDelete?.location}"? This action cannot be undone.`}
        />
    </div>
  );
};

export default GalleryScreen;
