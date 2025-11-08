import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import Card from './Card';
import Spinner from './Spinner';
import { GameMode, AIPersonas } from '../types';

interface StartScreenProps {
  onStart: (destination: string, gameMode: GameMode, aiPersona?: string) => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, isLoading, loadingMessage, error }) => {
  const [destination, setDestination] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.TWO_PLAYER);
  const [aiPersona, setAiPersona] = useState<string>(AIPersonas[0]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destination.trim()) {
      if (gameMode === GameMode.SINGLE_PLAYER) {
        onStart(destination.trim(), gameMode, aiPersona);
      } else {
        onStart(destination.trim(), gameMode);
      }
    }
  };

  return (
    <Card>
      <div className="px-8 pt-4 pb-8 text-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <Spinner />
            <p className="mt-4 text-brand-text-muted">{loadingMessage}</p>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2 font-display">Start a New Trip</h2>
            <p className="text-brand-text-muted mb-6">Choose a game mode and a destination.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Game Mode</label>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant={gameMode === GameMode.FOUR_PLAYER ? 'primary' : 'secondary'} onClick={() => setGameMode(GameMode.FOUR_PLAYER)}>Four Player</Button>
                  <Button type="button" variant={gameMode === GameMode.THREE_PLAYER ? 'primary' : 'secondary'} onClick={() => setGameMode(GameMode.THREE_PLAYER)}>Three Player</Button>
                  <Button type="button" variant={gameMode === GameMode.TWO_PLAYER ? 'primary' : 'secondary'} onClick={() => setGameMode(GameMode.TWO_PLAYER)}>Two Player</Button>
                  <Button type="button" variant={gameMode === GameMode.SINGLE_PLAYER ? 'primary' : 'secondary'} onClick={() => setGameMode(GameMode.SINGLE_PLAYER)}>vs. AI</Button>
                  <Button type="button" variant={gameMode === GameMode.SOLO_MODE ? 'primary' : 'secondary'} onClick={() => setGameMode(GameMode.SOLO_MODE)}>Solo Mode</Button>
                </div>
              </div>

              {gameMode === GameMode.SINGLE_PLAYER && (
                <div>
                  <label htmlFor="persona" className="block text-sm font-medium text-brand-text-muted mb-2">AI Persona</label>
                  <select
                    id="persona"
                    value={aiPersona}
                    onChange={(e) => setAiPersona(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-primary rounded-lg px-4 py-3 text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-shadow duration-200"
                  >
                    {AIPersonas.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-brand-text-muted mb-2">Destination</label>
                <Input
                  id="destination"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., The coast of Amalfi"
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" disabled={isLoading || !destination.trim()} className="animated-glow-button">
                Start Trip
              </Button>
            </form>
            {error && <p className="text-red-400 mt-4">{error}</p>}
          </>
        )}
      </div>
    </Card>
  );
};

export default StartScreen;