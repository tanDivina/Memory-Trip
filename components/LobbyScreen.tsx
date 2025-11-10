import React, { useState } from 'react';
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameCode).then(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    }).catch(err => {
        console.error('Failed to copy code: ', err);
    });
  };

  const handleCopyLink = () => {
    const joinLink = `${window.location.origin}${window.location.pathname}?joinGame=${gameCode}`;
    navigator.clipboard.writeText(joinLink).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    }).catch(err => {
        console.error('Failed to copy link: ', err);
    });
  };

  return (
    <Card className="animate-fade-in-up">
      <div className="p-8 text-center">
        <h2 className="text-3xl font-bold font-display mb-2">Game Lobby</h2>
        <p className="text-brand-text-muted mb-6">Share the code or link with your friends to join!</p>
        
        <div 
            className="bg-brand-bg border-2 border-dashed border-brand-primary rounded-lg py-4 mb-4 flex items-center justify-center gap-4"
        >
            <p className="text-5xl font-bold tracking-widest text-brand-text">{gameCode}</p>
        </div>

        <div className="flex justify-center items-center gap-4 mb-8">
            <Button variant="secondary" onClick={handleCopyCode} className="py-2 px-4 text-sm">
                {copiedCode ? 'Code Copied!' : 'Copy Code'}
            </Button>
            <Button variant="secondary" onClick={handleCopyLink} className="py-2 px-4 text-sm">
                {copiedLink ? 'Link Copied!' : 'Copy Invite Link'}
            </Button>
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