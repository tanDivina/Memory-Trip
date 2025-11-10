import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import Card from './Card';
import Spinner from './Spinner';
import { GameMode, AIPersonas } from '../types';

interface StartScreenProps {
  onStart: (config: {
    type: 'local' | 'create_online' | 'join_online';
    destination?: string;
    gameMode?: GameMode;
    aiPersona?: string;
    gameCode?: string;
  }) => void;
  onShowGallery: () => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onShowGallery, isLoading, loadingMessage, error }) => {
  const [destination, setDestination] = useState('');
  const [localGameMode, setLocalGameMode] = useState<GameMode>(GameMode.TWO_PLAYER);
  const [aiPersona, setAiPersona] = useState<string>(AIPersonas[0]);
  const [customAiPersona, setCustomAiPersona] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineMode, setOnlineMode] = useState<'create' | 'join'>('create');
  const [gameCode, setGameCode] = useState('');

  const isCustomPersona = aiPersona === 'Custom...';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (isOnline) {
      if (onlineMode === 'create' && destination.trim()) {
        onStart({ type: 'create_online', destination: destination.trim() });
      } else if (onlineMode === 'join' && gameCode.trim()) {
        onStart({ type: 'join_online', gameCode: gameCode.trim().toUpperCase() });
      }
    } else {
      if (!destination.trim()) return;

      if (localGameMode === GameMode.SINGLE_PLAYER) {
        const personaToSend = isCustomPersona ? customAiPersona.trim() : aiPersona;
        if (personaToSend) {
          onStart({ type: 'local', destination: destination.trim(), gameMode: localGameMode, aiPersona: personaToSend });
        }
      } else {
        onStart({ type: 'local', destination: destination.trim(), gameMode: localGameMode });
      }
    }
  };
  
  const getButtonText = () => {
    if (isLoading) return loadingMessage || "Loading...";
    if (isOnline) {
        return onlineMode === 'create' ? 'Create Online Game' : 'Join Game';
    }
    return 'Start Trip';
  }

  const isStartDisabled = isLoading || 
    (isOnline 
        ? (onlineMode === 'create' ? !destination.trim() : !gameCode.trim())
        : !destination.trim()
    ) || 
    (!isOnline && localGameMode === GameMode.SINGLE_PLAYER && isCustomPersona && !customAiPersona.trim());

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
            <p className="text-brand-text-muted mb-6">Play with friends on this device or online.</p>

            <div className="flex justify-center bg-brand-primary p-1 rounded-lg mb-6">
                <button onClick={() => setIsOnline(false)} className={`w-1/2 py-2 rounded-md font-semibold transition-colors ${!isOnline ? 'bg-brand-surface shadow' : 'text-brand-text-muted'}`}>
                    Local Game
                </button>
                <button onClick={() => setIsOnline(true)} className={`w-1/2 py-2 rounded-md font-semibold transition-colors ${isOnline ? 'bg-brand-surface shadow' : 'text-brand-text-muted'}`}>
                    Play Online
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isOnline ? (
                <div className="animate-fade-in-up">
                  <div className="flex border-b border-brand-primary mb-4">
                      <button type="button" onClick={() => setOnlineMode('create')} className={`flex-1 pb-2 font-semibold transition-colors ${onlineMode === 'create' ? 'text-brand-secondary border-b-2 border-brand-secondary' : 'text-brand-text-muted'}`}>
                          Create Game
                      </button>
                      <button type="button" onClick={() => setOnlineMode('join')} className={`flex-1 pb-2 font-semibold transition-colors ${onlineMode === 'join' ? 'text-brand-secondary border-b-2 border-brand-secondary' : 'text-brand-text-muted'}`}>
                          Join Game
                      </button>
                  </div>
                  <div className="animate-fade-in-up">
                    {onlineMode === 'create' ? (
                        <Input
                            type="text"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="e.g., A rainy street in Tokyo"
                            aria-label="Destination"
                        />
                    ) : (
                        <Input
                            type="text"
                            value={gameCode}
                            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                            placeholder="Enter Game Code"
                            aria-label="Game Code"
                            maxLength={4}
                        />
                    )}
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in-up space-y-4">
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
                      value={localGameMode}
                      onChange={(e) => setLocalGameMode(e.target.value as GameMode)}
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
                  {localGameMode === GameMode.SINGLE_PLAYER && (
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
                </div>
              )}
              
              <div className="pt-2 flex flex-col gap-3">
                <Button type="submit" disabled={isStartDisabled} className="w-full animated-glow-button">
                  {getButtonText()}
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