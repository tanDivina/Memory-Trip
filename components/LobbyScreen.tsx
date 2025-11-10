import React from 'react';
import { Player } from '../types';
import Button from './Button';
import Card from './Card';
import Spinner from './Spinner';

interface LobbyScreenProps {
  gameCode: string;
  players: Player[];
  isHost: boolean;
  onStartGame: () => void;
  isLoading: boolean;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ gameCode, players = [], isHost, onStartGame, isLoading }) => {
  const canStart = isHost && players.length >= 2;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameCode).then(() => {
        // Maybe show a "Copied!" message briefly
    }).catch(err => {
        console.error('Failed to copy code: ', err);
    });
  };

  return (
    <Card className="animate-fade-in-up">
      <div className="p-8 text-center">
        <h2 className="text-3xl font-bold font-display mb-2">Game Lobby</h2>
        <p className="text-brand-text-muted mb-6">Share this code with your friends to join!</p>
        
        <div 
            className="bg-brand-bg border-2 border-dashed border-brand-primary rounded-lg py-4 mb-6 flex items-center justify-center gap-4 cursor-pointer hover:border-brand-secondary"
            onClick={handleCopyCode}
            title="Click to copy"
        >
            <p className="text-5xl font-bold tracking-widest text-brand-text">{gameCode}</p>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        </div>

        <h3 className="text-xl font-bold font-display mb-4">Players Joined ({players.length}/4)</h3>
        <div className="space-y-2 text-left max-w-xs mx-auto mb-8 min-h-[120px]">
            {players.map((player, index) => (
                <div key={player.id} className="bg-brand-bg p-3 rounded-lg flex items-center gap-3 animate-fade-in-up">
                    <span className="font-bold text-brand-secondary">P{index + 1}</span>
                    <span className="text-brand-text truncate">{player.name}</span>
                    {isHost && index === 0 && <span className="text-xs text-brand-text-muted">(Host)</span>}
                </div>
            ))}
            {isLoading && !isHost && (
                <div className="flex justify-center pt-4">
                    <Spinner />
                </div>
            )}
        </div>

        {isHost ? (
            <Button onClick={onStartGame} disabled={!canStart || isLoading} className="w-full animated-glow-button">
                {isLoading ? 'Starting...' : `Start Game`}
            </Button>
        ) : (
            <p className="text-brand-text-muted italic">Waiting for the host to start the game...</p>
        )}
        {!canStart && isHost && <p className="text-xs text-brand-text-muted mt-2">You need at least 2 players to start.</p>}
      </div>
    </Card>
  );
};

export default LobbyScreen;
