
import React, { useEffect } from 'react';
import Button from './Button';
import Card from './Card';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <Card className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 relative">
          <h2 id="info-modal-title" className="text-3xl font-bold font-display text-center mb-4">How to Play</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-brand-text-muted hover:text-brand-text"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="space-y-6 text-brand-text">
            <div>
              <h3 className="text-xl font-bold font-display mb-2 text-brand-secondary">The Basics</h3>
              <p>The goal is to build a scene by adding items one by one. The catch? You have to remember everything that's already been added, in the correct order!</p>
              <ol className="list-decimal list-inside space-y-1 mt-2 pl-2">
                <li>Start a trip by choosing a game mode and a destination.</li>
                <li>On your turn, recall all items added to the scene so far, each on a new line.</li>
                <li>Then, add a new, single item of your own to the scene.</li>
                <li>The AI will generate an image of the scene with your new item included!</li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-bold font-display mb-2 text-brand-secondary">Game Modes</h3>
              <ul className="space-y-3">
                <li>
                  <strong className="font-semibold">Online Multiplayer:</strong> Create a game lobby and invite up to 3 friends using a unique game code. Play in real-time from anywhere, on any device!
                </li>
                <li>
                  <strong className="font-semibold">Local Multiplayer (2-4 Players):</strong> A classic "pass-and-play" memory challenge. Take turns with friends on a single device. If someone's memory fails, the other players win!
                </li>
                <li>
                  <strong className="font-semibold">Just Me Against AI:</strong> Test your memory against an AI opponent. The AI has a unique persona and will try to trip you up with its creative additions. Can you outlast the machine?
                </li>
                <li>
                  <strong className="font-semibold">Solo Mode:</strong> A relaxed, single-player creative mode. No timer, no memory test. Just build a scene and see where your imagination takes you. Click "Finish Trip" when you're done.
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Button onClick={onClose}>Got it!</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InfoModal;
