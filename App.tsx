import React, { useState, useCallback, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import InfoModal from './components/InfoModal';
import { generateInitialImage, editImage, getAIIdea, getTripSummary } from './services/geminiService';
import { GameState, GameSession, AddedBy, MemoryItem, GameMode } from './types';
import { playTurnSuccess, playGameOver, playCorrectSound, setSoundEnabled } from './services/audioService';

const TURN_DURATION_MS = 60000; // 60 seconds

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
    if (gameState === GameState.GAME_OVER && gameSession && !tripSummary) {
      const fetchSummary = async () => {
        setIsSummaryLoading(true);
        try {
          const summary = await getTripSummary(gameSession.basePrompt, gameSession.items.map(i => i.text));
          setTripSummary(summary);
        } catch (err) {
          console.error("Failed to generate trip summary:", err);
          setTripSummary("The AI traveler was too tired to write a journal entry for this trip."); // Fallback
        } finally {
          setIsSummaryLoading(false);
        }
      };
      fetchSummary();
    }
  }, [gameState, gameSession, tripSummary]);


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
        currentPlayer: AddedBy.PLAYER_1,
        gameMode: gameMode,
        aiPersona: gameMode === GameMode.SINGLE_PLAYER ? aiPersona : undefined,
        turnEndsAt: isSoloMode ? undefined : Date.now() + TURN_DURATION_MS,
      });
      setGameState(GameState.GAME);
    } catch (err) {
      console.error(err);
      setError('Failed to generate the initial scene. Please try again.');
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
        const existingItems = gameSession.items.map(i => i.text.toLowerCase());
        const recalledItemsArray = recalledItems.split('\n').map(i => i.trim().toLowerCase()).filter(i => i);

        if (recalledItemsArray.length !== existingItems.length || !recalledItemsArray.every((item, index) => item === existingItems[index])) {
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
            return;
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
      
      const sessionAfterPlayerTurn = {
        ...gameSession,
        items: newPlayerItems,
        currentImage: playerImageResult.base64Image,
        mimeType: playerImageResult.mimeType,
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
        
        setGameSession({
            ...sessionAfterPlayerTurn,
            items: newAiItems,
            currentImage: aiImageResult.base64Image,
            mimeType: aiImageResult.mimeType,
            turnEndsAt: Date.now() + TURN_DURATION_MS,
        });

      } else if (
        gameSession.gameMode === GameMode.TWO_PLAYER ||
        gameSession.gameMode === GameMode.THREE_PLAYER ||
        gameSession.gameMode === GameMode.FOUR_PLAYER
      ) {
        const turnOrderMap: Record<string, AddedBy[]> = {
            [GameMode.TWO_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2],
            [GameMode.THREE_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2, AddedBy.PLAYER_3],
            [GameMode.FOUR_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2, AddedBy.PLAYER_3, AddedBy.PLAYER_4],
        };
    
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
      setError('An error occurred while adding the item. Please try again.');
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

  const renderGameState = () => {
    switch(gameState) {
      case GameState.START:
        return <StartScreen onStart={handleStartGame} isLoading={isLoading} loadingMessage={loadingMessage} error={error} />;
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
      default:
        return <StartScreen onStart={handleStartGame} isLoading={isLoading} loadingMessage={loadingMessage} error={error} />;
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 pt-12 md:pt-20">
      <header className="w-full max-w-5xl text-center mb-8 relative">
        <div className="inline-flex items-center gap-4">
          <h1 className="text-5xl md:text-6xl font-bold text-brand-text tracking-tight font-display animated-title">
            {'Memory Trip'.split('').map((char, index) => (
              <span key={index} style={{ animationDelay: `${index * 0.07}s` }}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h1>
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9l4 4m0-4l-4 4" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="text-brand-text-muted hover:text-brand-text transition-colors duration-200"
            aria-label="How to play"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <p className="text-brand-text-muted mt-2">The visual memory game where the scene gets weirder with every turn.</p>
      </header>
      
      <main className="w-full flex-grow flex items-center justify-center">
        {renderGameState()}
      </main>

      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </div>
  );
};

export default App;