

import React, { useState, useCallback, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import InfoModal from './components/InfoModal';
import GalleryScreen from './components/GalleryScreen';
import Tooltip from './components/Tooltip';
import { generateInitialImage, editImage, getAIIdea, getTripSummary, validateMemory } from './services/geminiService';
import { GameState, GameSession, AddedBy, MemoryItem, GameMode } from './types';
import { playTurnSuccess, playGameOver, playCorrectSound, setSoundEnabled } from './services/audioService';
import { saveTrip } from './services/storageService';

const TURN_DURATION_MS = 60000; // 60 seconds

const titleColors = ['#26a69a', '#d96666', '#5e9ed6', '#d9a057', '#6fbf73', '#b363c2'];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [showCorrectMessage, setShowCorrectMessage] = useState<boolean>(false);
  const [tripSummary, setTripSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);

  useEffect(() => {
    setSoundEnabled(isSoundEnabled);
  }, [isSoundEnabled]);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.pageYOffset;
      // Apply a parallax effect by moving the background at half the scroll speed
      document.body.style.backgroundPositionY = `${offset * 0.5}px`;
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Reset the style when the component unmounts to avoid side effects
      document.body.style.backgroundPositionY = '';
    };
  }, []);

  useEffect(() => {
    if (gameState !== GameState.GAME || !gameSession?.turnEndsAt || isLoading || gameSession.gameMode === GameMode.SOLO_MODE) {
      return;
    }

    const checkTime = () => {
      const remainingTime = gameSession.turnEndsAt! - Date.now();
      if (remainingTime <= 0) {
        playGameOver();
        setGameOverReason("Time's up!");
        setGameState(GameState.GAME_OVER);
      }
    };

    const intervalId = setInterval(checkTime, 500);

    return () => clearInterval(intervalId);
  }, [gameState, gameSession, isLoading]);

  useEffect(() => {
    if (gameState === GameState.GAME_OVER && gameSession && !tripSummary && !isSummaryLoading) {
      const fetchSummary = async () => {
        setIsSummaryLoading(true);
        try {
          const summary = await getTripSummary(gameSession.basePrompt, gameSession.items.map(i => i.text));
          setTripSummary(summary);
        } catch (err) {
          console.error("Failed to generate trip summary:", err);
          setTripSummary("The traveler was too tired to write a journal entry for this trip."); // Fallback
        } finally {
          setIsSummaryLoading(false);
        }
      };
      fetchSummary();
    }
  }, [gameState, gameSession, isSummaryLoading, tripSummary]);

  // This new effect saves the trip once the summary is ready
  useEffect(() => {
      if (gameState === GameState.GAME_OVER && gameSession && tripSummary) {
          // Don't save if it was just a fallback summary from a failed API call and no items were added.
          if (gameSession.items.length === 0) return;

          saveTrip({
              location: gameSession.basePrompt,
              finalImage: gameSession.currentImage,
              mimeType: gameSession.mimeType,
              items: gameSession.items.map(i => i.text),
              summary: tripSummary,
          });
      }
  }, [tripSummary, gameState, gameSession]); // This will run only when tripSummary changes from null to a string.


  const handleStartGame = useCallback(async (destination: string, gameMode: GameMode, aiPersona?: string) => {
    setIsLoading(true);
    setLoadingMessage('Finding your destination...');
    setError(null);
    try {
      const { base64Image, mimeType } = await generateInitialImage(destination);
      const isSoloMode = gameMode === GameMode.SOLO_MODE;
      setGameSession({
        basePrompt: destination,
        items: [],
        currentImage: base64Image,
        mimeType: mimeType,
        imageHistory: [base64Image],
        currentPlayer: AddedBy.PLAYER_1,
        gameMode: gameMode,
        aiPersona: gameMode === GameMode.SINGLE_PLAYER ? aiPersona : undefined,
        turnEndsAt: isSoloMode ? undefined : Date.now() + TURN_DURATION_MS,
      });
      setGameState(GameState.GAME);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate the initial scene. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);

  const handlePlayerTurn = useCallback(async (recalledItems: string, newItem: string) => {
    if (!gameSession) return;
    const isSoloMode = gameSession.gameMode === GameMode.SOLO_MODE;

    // 1. Validate Memory (skip for Solo Mode)
    if (!isSoloMode) {
        const recalledItemsArray = recalledItems.split('\n').map(i => i.trim()).filter(i => i);
        const actualItems = gameSession.items.map(i => i.text);

        const failMemory = () => {
            let reason = '';
            if (gameSession.gameMode === GameMode.SINGLE_PLAYER) {
                reason = "Your memory failed!";
            } else {
                let loser = '';
                switch (gameSession.currentPlayer) {
                    case AddedBy.PLAYER_1: loser = 'Player 1'; break;
                    case AddedBy.PLAYER_2: loser = 'Player 2'; break;
                    case AddedBy.PLAYER_3: loser = 'Player 3'; break;
                    case AddedBy.PLAYER_4: loser = 'Player 4'; break;
                }
                reason = `${loser}'s memory failed!`;
            }
            playGameOver();
            setGameOverReason(reason);
            setGameState(GameState.GAME_OVER);
        };

        // Quick check: if the number of items is wrong, fail immediately.
        if (recalledItemsArray.length !== actualItems.length) {
            failMemory();
            return;
        }

        // If there are items to check, use the AI service for semantic validation.
        if (actualItems.length > 0) {
            setIsLoading(true);
            setLoadingMessage('Checking your memory...');
            setError(null);
            try {
                const validationResult = await validateMemory(recalledItemsArray, actualItems);
                if (!validationResult.correct) {
                    failMemory();
                    // Stop loading and return on failure
                    setIsLoading(false);
                    setLoadingMessage('');
                    return;
                }
            } catch (err) {
                console.error(err);
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('An error occurred while checking your memory. Please try again.');
                }
                setIsLoading(false);
                setLoadingMessage('');
                return; // Stop the turn on validation error
            }
        }

        // CORRECT RECALL! Celebrate.
        if (gameSession.items.length > 0) { // Don't show on first turn
            setShowCorrectMessage(true);
            playCorrectSound();
            await new Promise(resolve => setTimeout(resolve, 1500)); // Pause for celebration
            setShowCorrectMessage(false);
        }
    }
    
    // 2. Add Player's Item
    setIsLoading(true);
    setError(null);
    setLoadingMessage(`Adding "${newItem}" to the scene...`);

    try {
      const playerImageResult = await editImage(gameSession.currentImage, gameSession.mimeType, newItem);
      const newPlayerItems: MemoryItem[] = [...gameSession.items, { text: newItem, addedBy: gameSession.currentPlayer }];
      const historyAfterPlayer = [...gameSession.imageHistory, playerImageResult.base64Image];
      
      const sessionAfterPlayerTurn = {
        ...gameSession,
        items: newPlayerItems,
        currentImage: playerImageResult.base64Image,
        mimeType: playerImageResult.mimeType,
        imageHistory: historyAfterPlayer,
      };

      // 3. Handle next turn based on game mode
      if (gameSession.gameMode === GameMode.SINGLE_PLAYER && gameSession.aiPersona) {
        setLoadingMessage(`AI (${gameSession.aiPersona}) is thinking...`);
        
        const aiItemIdea = await getAIIdea(
            gameSession.aiPersona, 
            gameSession.basePrompt, 
            newPlayerItems.map(i => i.text)
        );
        
        setLoadingMessage(`AI is adding "${aiItemIdea}"...`);

        const aiImageResult = await editImage(playerImageResult.base64Image, playerImageResult.mimeType, aiItemIdea);
        const newAiItems: MemoryItem[] = [...newPlayerItems, { text: aiItemIdea, addedBy: AddedBy.AI }];
        const historyAfterAI = [...historyAfterPlayer, aiImageResult.base64Image];
        
        setGameSession({
            ...sessionAfterPlayerTurn,
            items: newAiItems,
            currentImage: aiImageResult.base64Image,
            mimeType: aiImageResult.mimeType,
            imageHistory: historyAfterAI,
            turnEndsAt: Date.now() + TURN_DURATION_MS,
        });

      } else if (
        // Fix: Removed redundant comments.
        gameSession.gameMode === GameMode.TWO_PLAYER ||
        gameSession.gameMode === GameMode.THREE_PLAYER ||
        gameSession.gameMode === GameMode.FOUR_PLAYER
      ) {
        const turnOrderMap: Record<string, AddedBy[]> = {
            [GameMode.TWO_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2],
            [GameMode.THREE_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2, AddedBy.PLAYER_3],
            [GameMode.FOUR_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2, AddedBy.PLAYER_3, AddedBy.PLAYER_4],
        };
    
        // Fix: Removed redundant comment.
        const turnOrder = turnOrderMap[gameSession.gameMode];
        const currentPlayerIndex = turnOrder.indexOf(gameSession.currentPlayer);
        const nextPlayerIndex = (currentPlayerIndex + 1) % turnOrder.length;
        const nextPlayer = turnOrder[nextPlayerIndex];

        setGameSession({
            ...sessionAfterPlayerTurn,
            currentPlayer: nextPlayer,
            turnEndsAt: Date.now() + TURN_DURATION_MS,
        });
      } else { // Solo Mode
        setGameSession(sessionAfterPlayerTurn);
      }


      playTurnSuccess();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while adding the item. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [gameSession]);

  const handleFinishTrip = useCallback(() => {
    setGameState(GameState.GAME_OVER);
    setGameOverReason("Your creative journey is complete!");
  }, []);

  const handleResetGame = useCallback(() => {
    setGameState(GameState.START);
    setGameSession(null);
    setError(null);
    setGameOverReason('');
    setShowCorrectMessage(false);
    setTripSummary(null);
    setIsSummaryLoading(false);
  }, []);

  const handleShowGallery = useCallback(() => {
    setGameState(GameState.GALLERY);
  }, []);

  const renderGameState = () => {
    switch(gameState) {
      case GameState.START:
        return <StartScreen onStart={handleStartGame} onShowGallery={handleShowGallery} isLoading={isLoading} loadingMessage={loadingMessage} error={error} />;
      case GameState.GAME:
        if (gameSession) {
          return <GameScreen 
            session={gameSession} 
            onTakeTurn={handlePlayerTurn} 
            onReset={handleResetGame} 
            onFinishTrip={handleFinishTrip}
            isLoading={isLoading} 
            loadingMessage={loadingMessage}
            error={error}
            showCorrectMessage={showCorrectMessage}
          />
        }
        return null;
      case GameState.GAME_OVER:
        if (gameSession) {
          return <GameOverScreen 
                    session={gameSession} 
                    onRestart={handleResetGame} 
                    reason={gameOverReason} 
                    tripSummary={tripSummary}
                    isSummaryLoading={isSummaryLoading}
                />
        }
        return null;
       case GameState.GALLERY:
        return <GalleryScreen onBack={handleResetGame} />;
      default:
        return <StartScreen onStart={handleStartGame} onShowGallery={handleShowGallery} isLoading={isLoading} loadingMessage={loadingMessage} error={error} />;
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 pt-12 md:pt-20">
      <header className="w-full max-w-5xl text-center mb-8 relative">
        <div className="inline-flex items-center gap-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight font-display">
            {'Memory Trip'.split('').map((char, index) => (
              <span key={index} style={{ color: titleColors[index % titleColors.length] }}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h1>
          <Tooltip text={isSoundEnabled ? 'Disable sound effects' : 'Enable sound effects'}>
            <button
              onClick={() => setIsSoundEnabled(prev => !prev)}
              className="text-brand-text-muted hover:text-brand-text transition-colors duration-200"
              aria-label={isSoundEnabled ? 'Disable sound effects' : 'Enable sound effects'}
            >
              {isSoundEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                // Fix: Replaced truncated SVG path with a valid path for a "mute" icon.
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9l-6 6m0-6l6 6" />
                </svg>
              )}
            </button>
          </Tooltip>
        </div>
      </header>
      <main className="w-full max-w-5xl flex justify-center">
        {renderGameState()}
      </main>
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
       <button 
        onClick={() => setIsInfoModalOpen(true)} 
        className="fixed bottom-4 right-4 bg-brand-secondary text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:bg-opacity-90 transition-transform transform hover:scale-110"
        aria-label="How to play"
        title="How to play"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  );
};

// Fix: Add default export to make the component available for import.
export default App;