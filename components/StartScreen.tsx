import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import Card from './Card';
import Spinner from './Spinner';
import { GameMode, AIPersonas } from '../types';

interface StartScreenProps {
  onStart: (destination: string, gameMode: GameMode, aiPersona?: string) => void;
  onShowGallery: () => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onShowGallery, isLoading, loadingMessage, error }) => {
  const [destination, setDestination] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.TWO_PLAYER);
  const [aiPersona, setAiPersona] = useState<string>(AIPersonas[0]);
  const [customAiPersona, setCustomAiPersona] = useState('');

  const isCustomPersona = aiPersona === 'Custom...';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !destination.trim()) return;

    if (gameMode === GameMode.SINGLE_PLAYER) {
      const personaToSend = isCustomPersona ? customAiPersona.trim() : aiPersona;
      if (personaToSend) {
        onStart(destination.trim(), gameMode, personaToSend);
      }
    } else {
      onStart(destination.trim(), gameMode);
    }
  };

  const isStartDisabled = isLoading || !destination.trim() || 
    (gameMode === GameMode.SINGLE_PLAYER && isCustomPersona && !customAiPersona.trim());

  return (
    <Card>
      <div className="px-8 pt-4 pb-8 text-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <Spinner />
            <p className="mt-4 text-brand-text-muted">{loadingMessage}</p>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold font-display mb-2">Start a New Trip</h2>
            <p className="text-brand-text-muted mb-6">Choose a destination and a game mode to begin.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., A rainy street in Tokyo"
                  aria-label="Destination"
                />
              </div>

              <div>
                <select
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value as GameMode)}
                  className="w-full bg-brand-bg border border-brand-primary rounded-lg px-4 py-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-shadow duration-200"
                  aria-label="Game Mode"
                >
                  <option value={GameMode.SOLO_MODE}>Solo Mode</option>
                  <option value={GameMode.SINGLE_PLAYER}>Just Me Against AI</option>
                  <option value={GameMode.TWO_PLAYER}>2 Players</option>
                  <option value={GameMode.THREE_PLAYER}>3 Players</option>
                  <option value={GameMode.FOUR_PLAYER}>4 Players</option>
                </select>
              </div>

              {gameMode === GameMode.SINGLE_PLAYER && (
                <div className="space-y-4 animate-fade-in-up">
                  <select
                    value={aiPersona}
                    onChange={(e) => setAiPersona(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-primary rounded-lg px-4 py-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-shadow duration-200"
                    aria-label="AI Persona"
                  >
                    {AIPersonas.map((persona) => (
                      <option key={persona} value={persona}>{persona}</option>
                    ))}
                  </select>

                  {isCustomPersona && (
                     <div className="animate-fade-in-up">
                        <Input
                            type="text"
                            value={customAiPersona}
                            onChange={(e) => setCustomAiPersona(e.target.value)}
                            placeholder="Describe the AI's persona..."
                            aria-label="Custom AI Persona"
                        />
                    </div>
                  )}
                </div>
              )}
              
              <div className="pt-2 flex flex-col gap-3">
                <Button type="submit" disabled={isStartDisabled} className="w-full animated-glow-button">
                  Start Trip
                </Button>
                 <Button variant="secondary" onClick={onShowGallery} className="w-full">
                    Trip Gallery
                </Button>
              </div>

            </form>
            {error && <p className="mt-4 text-center text-red-500">{error}</p>}
          </>
        )}
      </div>
    </Card>
  );
};

export default StartScreen;