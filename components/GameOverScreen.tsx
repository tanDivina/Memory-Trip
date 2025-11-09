import React, { useState, useEffect } from 'react';
import { GameSession, AddedBy, GameMode } from '../types';
import Button from './Button';
import Card from './Card';
import Spinner from './Spinner';
import { generatePostcard } from '../services/postcardService';

interface GameOverScreenProps {
  session: GameSession;
  onRestart: () => void;
  reason: string;
  tripSummary: string | null;
  isSummaryLoading: boolean;
}

// Helper function to convert Data URL to File object for the Web Share API
const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) { return null; }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) { return null; }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
};


const GameOverScreen: React.FC<GameOverScreenProps> = ({ session, onRestart, reason, tripSummary, isSummaryLoading }) => {
  const [isGeneratingPostcard, setIsGeneratingPostcard] = useState(false);
  const [isSharingPostcard, setIsSharingPostcard] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrameIndex, setAnimationFrameIndex] = useState(0);

  const canShare = typeof navigator.share === 'function';
  const isSoloMode = session.gameMode === GameMode.SOLO_MODE;
  let winnerText: string;

  useEffect(() => {
    if (!isAnimating || session.imageHistory.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setAnimationFrameIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= session.imageHistory.length) {
            clearInterval(interval);
            setIsAnimating(false); // Animation is done
            return prevIndex; // Stay on the last frame
        }
        return nextIndex;
      });
    }, 1500); // 1.5 seconds per frame

    return () => clearInterval(interval);
  }, [isAnimating, session.imageHistory.length]);

  if (session.gameMode === GameMode.SINGLE_PLAYER) {
    winnerText = `The AI (${session.aiPersona || 'Opponent'}) wins!`;
  } else {
    const turnOrderMap: Record<string, AddedBy[]> = {
        [GameMode.TWO_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2],
        [GameMode.THREE_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2, AddedBy.PLAYER_3],
        [GameMode.FOUR_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2, AddedBy.PLAYER_3, AddedBy.PLAYER_4],
    };

    const getPlayerName = (player: AddedBy): string => `Player ${player.split('_')[1]}`;
    
    let winner: string;

    if (turnOrderMap[session.gameMode]) {
        const turnOrder = turnOrderMap[session.gameMode];
        const winners = turnOrder.filter(p => p !== session.currentPlayer).map(getPlayerName);
        
        if (winners.length > 1) {
            winner = winners.join(', ').replace(/, ([^,]*)$/, ' and $1');
        } else {
            winner = winners[0];
        }
    } else {
        // Fallback for 2 player, though it's covered above.
        winner = session.currentPlayer === AddedBy.PLAYER_1 ? 'Player 2' : 'Player 1';
    }
    winnerText = `Congratulations, ${winner}!`;
  }

  const handleAnimateTrip = () => {
    if (isAnimating) return; // Don't do anything if already animating
    
    // Reset to first frame and start animation
    setAnimationFrameIndex(0);
    setIsAnimating(true);
  };

  const handleDownloadPostcard = async () => {
    if (!tripSummary) return;
    setIsGeneratingPostcard(true);
    try {
        const postcardDataUrl = await generatePostcard({
            finalImageSrc: `data:${session.mimeType};base64,${session.currentImage}`,
            summary: tripSummary,
            items: session.items.map(item => item.text),
            location: session.basePrompt,
        });

        const sanitizedLocation = session.basePrompt
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
            .substring(0, 50); // Avoid overly long filenames

        const link = document.createElement('a');
        link.href = postcardDataUrl;
        link.download = `memory-trip-${sanitizedLocation}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Failed to generate postcard:", error);
    } finally {
        setIsGeneratingPostcard(false);
    }
  };

  const handleSharePostcard = async () => {
    if (!tripSummary || !canShare) return;
    setIsSharingPostcard(true);
    try {
        const postcardDataUrl = await generatePostcard({
            finalImageSrc: `data:${session.mimeType};base64,${session.currentImage}`,
            summary: tripSummary,
            items: session.items.map(item => item.text),
            location: session.basePrompt,
        });
        
        const sanitizedLocation = session.basePrompt
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
            .substring(0, 50); // Avoid overly long filenames

        const postcardFile = dataURLtoFile(postcardDataUrl, `memory-trip-${sanitizedLocation}.png`);

        if (postcardFile && navigator.canShare && navigator.canShare({ files: [postcardFile] })) {
            await navigator.share({
                title: 'My Memory Trip!',
                text: `Check out the wild trip I went on to ${session.basePrompt}!`,
                files: [postcardFile],
            });
        } else {
            console.warn("Could not share the postcard file, falling back to download.");
            handleDownloadPostcard();
        }

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('Share action was cancelled by the user.');
        } else {
            console.error("Failed to share postcard:", error);
        }
    } finally {
        setIsSharingPostcard(false);
    }
  };

  const displayedImage = isAnimating 
      ? session.imageHistory[animationFrameIndex] 
      : session.currentImage;

  const currentItem = (isAnimating && animationFrameIndex > 0) 
      ? session.items[animationFrameIndex - 1] 
      : null;


  return (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="md:col-span-1 p-4 bg-white shadow-lg transform rotate-2">
        <div className="relative aspect-square w-full bg-brand-primary">
          <img
            key={animationFrameIndex}
            src={`data:${session.mimeType};base64,${displayedImage}`}
            alt={session.basePrompt}
            className="w-full h-full object-cover"
          />
           {/* Street View UI Overlay */}
           <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white text-xs rounded-md px-2 py-1 font-sans shadow-lg select-none">
                Street View
            </div>
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 p-2 rounded-full shadow-lg select-none">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
                    <path d="M12 2L14.5 7H9.5L12 2Z" fill="#26a69a"/>
                    <path d="M12 22L14.5 17H9.5L12 22Z" fill="white"/>
                </svg>
            </div>
            {currentItem && (
              <div key={animationFrameIndex} className="absolute inset-x-0 bottom-16 p-4 flex justify-center">
                  <div className="bg-black bg-opacity-75 text-white text-lg font-semibold rounded-lg px-4 py-2 shadow-lg animate-fade-in-up">
                  Added: "{currentItem.text}"
                  </div>
              </div>
            )}
           <div className="absolute inset-x-0 bottom-0 p-4 pt-10 bg-gradient-to-t from-black/60 to-transparent">
            <h3 className="text-white text-2xl font-bold font-display">{isAnimating ? `Step ${animationFrameIndex + 1} / ${session.imageHistory.length}` : 'The final scene!'}</h3>
          </div>
        </div>
      </div>
       <Card className="md:col-span-1">
         <div className="p-8 text-center">
          <h2 className="text-4xl font-bold text-brand-secondary mb-2 font-display">
            {isSoloMode ? 'Trip Complete!' : 'Game Over!'}
          </h2>

          {isSoloMode ? (
            <p className="text-xl text-brand-text mb-6">Here's the final scene from your journey!</p>
          ) : (
            <>
              {reason && <p className="text-xl text-brand-text mb-4">{reason}</p>}
              <p className="text-xl font-bold text-green-600 mb-6">{winnerText}</p>
            </>
          )}
          
          <div className="text-left bg-brand-bg p-4 rounded-lg border border-brand-primary mb-6">
            <h4 className="font-bold text-xl mb-2 text-center font-display">The final list:</h4>
            {session.items.length > 0 ? (
                <ol className="list-decimal list-inside space-y-1 text-brand-text">
                    {session.items.map((item, index) => (
                    <li key={index}>{item.text}</li>
                    ))}
                </ol>
            ) : (
                <p className="text-brand-text-muted text-center italic">No items were even added!</p>
            )}
          </div>

          <div className="text-left bg-yellow-50 bg-opacity-50 p-4 rounded-lg border border-yellow-200 mb-6">
            <h4 className="font-bold text-xl mb-2 text-center font-display text-yellow-800">Traveler's Journal</h4>
            {isSummaryLoading ? (
                <div className="flex justify-center items-center py-4">
                    <Spinner /> 
                </div>
            ) : (
                <p className="text-brand-text-muted italic whitespace-pre-wrap">{tripSummary}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-4">
             <Button
                onClick={handleAnimateTrip}
                disabled={session.items.length < 1 || isAnimating}
                className="w-full"
                variant="secondary"
              >
                {isAnimating ? 'Animating...' : 'Animate Trip'}
            </Button>
            {canShare && (
                <Button
                    onClick={handleSharePostcard}
                    disabled={isSummaryLoading || isGeneratingPostcard || isSharingPostcard || !tripSummary}
                    className="w-full"
                    variant="secondary"
                    title="Opens your device's native share dialog to send to any app."
                >
                    {isSharingPostcard ? 'Preparing...' : 'Share Postcard'}
                </Button>
            )}
            <Button 
                onClick={handleDownloadPostcard}
                disabled={isSummaryLoading || isGeneratingPostcard || isSharingPostcard || !tripSummary}
                className="w-full"
                variant="secondary"
            >
                {isGeneratingPostcard ? 'Creating...' : 'Download Postcard'}
            </Button>
            <Button onClick={onRestart} className="w-full">
                Play Again
            </Button>
          </div>
        </div>
       </Card>
    </div>
  );
};

export default GameOverScreen;