import React, { useState, useEffect } from 'react';
import { StoredTrip } from '../types';
import { getTrips } from '../services/storageService';
import Button from './Button';
import Card from './Card';
import GalleryDetailModal from './GalleryDetailModal';

interface GalleryScreenProps {
  onBack: () => void;
}

const GalleryScreen: React.FC<GalleryScreenProps> = ({ onBack }) => {
  const [trips, setTrips] = useState<StoredTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<StoredTrip | null>(null);

  useEffect(() => {
    setTrips(getTrips());
  }, []);

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
                        className="bg-brand-surface rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer flex overflow-hidden"
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
                            <div className="mt-auto pt-2">
                                <p className="text-xs font-semibold text-brand-secondary">{trip.items.length} {trip.items.length === 1 ? 'item' : 'items'} added</p>
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
    </div>
  );
};

export default GalleryScreen;