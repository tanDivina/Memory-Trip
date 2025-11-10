

import React, { useState, useCallback, useEffect, useRef } from 'react';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import InfoModal from './components/InfoModal';
import GalleryScreen from './components/GalleryScreen';
import Tooltip from './components/Tooltip';
import LobbyScreen from './components/LobbyScreen';
import { 
  generateInitialImage, editImage, getAIIdea, getTripSummary, validateMemory,
  createOnlineGame, joinOnlineGame, getGameState, startGame, submitOnlineTurn 
} from './services/geminiService';
import { GameState, GameSession, AddedBy, MemoryItem, GameMode } from './types';
import { playTurnSuccess, playGameOver, playCorrectSound, setSoundEnabled } from './services/audioService';
import { saveTrip } from './services/storageService';

const TURN_DURATION_MS = 60000; // 60 seconds

const titleColors = ['#26a69a', '#d96666', '#5e9ed6', '#d9a057', '#6fbf73', '#b363c2'];

const backgroundImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGIwVFBkiHRsYIikoJSElLiQqKCQoMDU0PjU2NjP/2wBDAQYHBwYIChgQISgaJSMoNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjP/wAARCAAgADsDASIAAhEBAxEB/8QAGwAAAgIDAQAAAAAAAAAAAAAAAAQDBgECBQf/xAApEAACAgEDAgUFAQEAAAAAAAABAgMEEQAFIRIGMUETcSIyUWFxgaGx/8QAGAEAAgMAAAAAAAAAAAAAAAAAAQIAAwT/xAAeEQACAgICAwEAAAAAAAAAAAAAAQIRAyESMRNBQv/aAAwDAQACEQMRAD8A+iNc/L8G23Jv3vN6i2T400c0KzV5I3rM5d1I8+2VHbP3p/tG7191uM1iW/NVq1YJHTeNIwRnHJmGT+B8aJ7vu+1SbhXo2Nykq03/kLPE8bI/wB/cMqT/jod3HulOvdV4rG42b15mKxU2R+Sg48jHPyc+3jWpJJno0kkzX1N8v7ruV+vSuN/sUNtTrPXSJDJG68T7ZGBg+dI9o3/cd0uQ0rO9XoFZiZJ5I4mjjGMkkk5PwwPGl227nt1vcJYbG4yVYZgP5Ms8LxMh+uVYHH50X3Dc6NGrZq1biZqqxtHFUZXJkBHtHjIPyT4HjSTtF8Y9k65uvUe83JKdLf7tWzOFSKaOF5GOM9gAD/ALoxtV/ctw26eK3vV2rcWQpDWdIlZ8gHlgDIx6c6A1N322S9FVu7jPjZgDVSeGRWkJOMZCnGTj3aJ7Xu9GCw1WrcTPTErJFVRXJcY/SPGR8k+B40W2NKK7L1h6t32vcP8Ay5d7tV3mQf8AJpwxmQjOC2SM4/GjG2395v7lXoVuqNynDM5SSxLTwMkYxnnkHk/YedCd33XbU3CKtZuMlWm//ACFlheNkfHnOVBI/wA6JbXudKrdT1o6/J67ERFUjVyXBH6RwMj5J8eNK2wUUuzY11vO8X9yp0aPVG40oZ2KzWpaeBkXBOSc8j2A86Lbfe3a5u1WjR6q3FLe8lJLstNAGRcHlgHJ/AGgO77nt8W5RVr24SVoJsDz5Z4XjZDx5zkKSM+M6N7PudKrdT1Ya/Jq6xkxVY1clwR+kcDI+SfHjSvoFFF9nQNZ6m6g3Grcu+ol2/TgmEb1BBAjZwd3JU+P6d9Ntq3Tc9y3OpQourV6nBMSstmWliZIsAkkgnJ7Y8eNIdq3ja4d1ipVtzkpQygeXNPPE8bLx5zkKQceM6Y7duVClu1S/HRD1Y5i/8Ay0a5bBH6RjI+T48aW2Pij2i+/wB5u7tXo0OqFxgnmJWWzLTQskWEJ5HJz2wMfedKOr9ebrf3qnQo9UbglSZyktmWngZEAVjlgHJ8gDwPGgG7bpt6bjFWvbk9SCbHmzTxPE6cQcZylScZx7tGNo3KjU3OpehoCSokrM/8Ayo1y2ARggjPz48eNK+gUV2dM0jqTe9z3qjQo9VL0ayzMJ7E1NAkaBWORycnkA8Dvp/t167du1WvQ6rXUklmYSTzU0CxAKTyOWSc4xgfedJNh3bZqO706FbeJKcDsHaeaeN424q2AcKSDgDvjRjat0o0t1q34qIlijm5/8tGuWwCORjI+fHjStj4o9n/9k=';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [showCorrectMessage, setShowCorrectMessage] = useState<boolean>(false);
  const [tripSummary, setTripSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [initialJoinCode, setInitialJoinCode] = useState<string | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);


  useEffect(() => {
    setSoundEnabled(isSoundEnabled);
  }, [isSoundEnabled]);

  // Check for join game link on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameCode = urlParams.get('joinGame');
    if (gameCode) {
      setInitialJoinCode(gameCode.toUpperCase());
      // Clean the URL so it doesn't persist on refresh if the user navigates away
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Polling effect for online games
  useEffect(() => {
    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  
    if (gameSession?.gameCode && (gameState === GameState.LOBBY || (gameState === GameState.GAME && gameSession.gameMode === GameMode.ONLINE))) {
      pollingIntervalRef.current = window.setInterval(async () => {
        try {
          const { gameState: serverState, gameStatus } = await getGameState(gameSession.gameCode!);
          
          if (gameStatus === 'active') {
             // If the game has started server-side, move the local state to GAME
             if (gameState === GameState.LOBBY) {
                setGameState(GameState.GAME);
             }
             setGameSession(serverState);
          } else if (gameStatus === 'lobby') {
            setGameSession(serverState);
          } else if (gameStatus === 'finished') {
            setGameSession(serverState);
            setGameOverReason(serverState.gameOverReason);
            setGameState(GameState.GAME_OVER);
            stopPolling();
          }
        } catch (err) {
          console.error("Polling error:", err);
          setError("Lost connection to the game server.");
          stopPolling();
        }
      }, 3000); // Poll every 3 seconds
    }
  
    // Cleanup interval when the effect dependencies change
    return stopPolling;
  }, [gameState, gameSession?.gameCode, gameSession?.gameMode]);


  useEffect(() => {
    if (gameState !== GameState.GAME || !gameSession?.turnEndsAt || isLoading || gameSession.gameMode === GameMode.SOLO_MODE || gameSession.gameMode === GameMode.ONLINE) {
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
          setTripSummary("The AI traveler was too tired to write a journal entry for this trip.");
        } finally {
          setIsSummaryLoading(false);
        }
      };
      fetchSummary();
    }
  }, [gameState, gameSession, isSummaryLoading, tripSummary]);

  useEffect(() => {
      if (gameState === GameState.GAME_OVER && gameSession && tripSummary) {
          if (gameSession.items.length === 0) return;
          saveTrip({
              location: gameSession.basePrompt,
              finalImage: gameSession.currentImage,
              mimeType: gameSession.mimeType,
              items: gameSession.items.map(i => i.text),
              summary: tripSummary,
          });
      }
  }, [tripSummary, gameState, gameSession]);


  const handleStart = useCallback(async (config: {
    type: 'local' | 'create_online' | 'join_online';
    destination?: string;
    gameMode?: GameMode;
    aiPersona?: string;
    gameCode?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
        if (config.type === 'local' && config.destination) {
            setLoadingMessage('Finding your destination...');
            const { base64Image, mimeType } = await generateInitialImage(config.destination);
            const isSoloMode = config.gameMode === GameMode.SOLO_MODE;
            setGameSession({
                basePrompt: config.destination,
                items: [],
                currentImage: base64Image,
                mimeType: mimeType,
                imageHistory: [base64Image],
                currentPlayer: AddedBy.PLAYER_1,
                gameMode: config.gameMode!,
                aiPersona: config.gameMode === GameMode.SINGLE_PLAYER ? config.aiPersona : undefined,
                turnEndsAt: isSoloMode ? undefined : Date.now() + TURN_DURATION_MS,
            });
            setGameState(GameState.GAME);
        } else if (config.type === 'create_online' && config.destination) {
            setLoadingMessage('Creating online game...');
            const playerName = `Player ${Math.floor(Math.random() * 900) + 100}`;
            const { playerId, gameState: initialState } = await createOnlineGame(config.destination, playerName);
            setPlayerId(playerId);
            setGameSession(initialState);
            setGameState(GameState.LOBBY);
        } else if (config.type === 'join_online' && config.gameCode) {
            setLoadingMessage(`Joining game ${config.gameCode}...`);
            const playerName = `Player ${Math.floor(Math.random() * 900) + 100}`;
            const { playerId, gameState: initialState } = await joinOnlineGame(config.gameCode, playerName);
            setPlayerId(playerId);
            setGameSession(initialState);
            if (initialState.gameStatus === 'active') {
                setGameState(GameState.GAME);
            } else {
                setGameState(GameState.LOBBY);
            }
        }
    } catch (err) {
        console.error(err);
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred. Please try again.');
        }
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, []);

  const handleStartOnlineGame = useCallback(async () => {
    if (!gameSession?.gameCode || !playerId || !gameSession.basePrompt) return;
    setIsLoading(true);
    setError(null);
    try {
      await startGame(gameSession.gameCode, playerId, gameSession.basePrompt);
      // Polling will handle the state transition
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start the game.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameSession, playerId]);

  const handlePlayerTurn = useCallback(async (recalledItems: string, newItem: string) => {
    if (!gameSession) return;
    const isSoloMode = gameSession.gameMode === GameMode.SOLO_MODE;
    const isOnlineMode = gameSession.gameMode === GameMode.ONLINE;

    // Online turn submission
    if (isOnlineMode) {
        if (!gameSession.gameCode || !playerId) return;
        setIsLoading(true);
        setLoadingMessage('Submitting your turn...');
        setError(null);
        try {
            const recalledItemsArray = recalledItems.split('\n').map(i => i.trim()).filter(i => i);
            await submitOnlineTurn(gameSession.gameCode, playerId, recalledItemsArray, newItem);
            // Polling will update the game state
        } catch (err) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to submit your turn.');
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
        return;
    }

    // --- Local Game Turn Logic ---

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

        if (recalledItemsArray.length !== actualItems.length) {
            failMemory();
            return;
        }

        if (actualItems.length > 0) {
            setIsLoading(true);
            setLoadingMessage('Checking your memory...');
            setError(null);
            try {
                const validationResult = await validateMemory(recalledItemsArray, actualItems);
                if (!validationResult.correct) {
                    failMemory();
                    setIsLoading(false);
                    setLoadingMessage('');
                    return;
                }
            } catch (err) {
                console.error(err);
                if (err instanceof Error) { setError(err.message); } 
                else { setError('An error occurred while checking your memory.'); }
                setIsLoading(false);
                setLoadingMessage('');
                return;
            }
        }

        if (gameSession.items.length > 0) {
            setShowCorrectMessage(true);
            playCorrectSound();
            await new Promise(resolve => setTimeout(resolve, 1500));
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

      if (gameSession.gameMode === GameMode.SINGLE_PLAYER && gameSession.aiPersona) {
        setLoadingMessage(`AI (${gameSession.aiPersona}) is thinking...`);
        const aiItemIdea = await getAIIdea(gameSession.aiPersona, gameSession.basePrompt, newPlayerItems.map(i => i.text));
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
      } else if ( [GameMode.TWO_PLAYER, GameMode.THREE_PLAYER, GameMode.FOUR_PLAYER].includes(gameSession.gameMode) ) {
        const turnOrderMap: Record<string, AddedBy[]> = {
            [GameMode.TWO_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2],
            [GameMode.THREE_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2, AddedBy.PLAYER_3],
            [GameMode.FOUR_PLAYER]: [AddedBy.PLAYER_1, AddedBy.PLAYER_2, AddedBy.PLAYER_3, AddedBy.PLAYER_4],
        };
        const turnOrder = turnOrderMap[gameSession.gameMode];
        const currentPlayerIndex = turnOrder.indexOf(gameSession.currentPlayer);
        const nextPlayerIndex = (currentPlayerIndex + 1) % turnOrder.length;
        const nextPlayer = turnOrder[nextPlayerIndex];
        setGameSession({ ...sessionAfterPlayerTurn, currentPlayer: nextPlayer, turnEndsAt: Date.now() + TURN_DURATION_MS });
      } else { // Solo Mode
        setGameSession(sessionAfterPlayerTurn);
      }
      playTurnSuccess();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) { setError(err.message); } 
      else { setError('An error occurred while adding the item.'); }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [gameSession, playerId]);

  const handleFinishTrip = useCallback(() => {
    setGameState(GameState.GAME_OVER);
    setGameOverReason("Your creative journey is complete!");
  }, []);

  const handleResetGame = useCallback(() => {
    setGameState(GameState.START);
    setGameSession(null);
    setPlayerId(null);
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
        return <StartScreen 
                  onStart={handleStart} 
                  onShowGallery={handleShowGallery} 
                  isLoading={isLoading} 
                  loadingMessage={loadingMessage} 
                  error={error}
                  initialJoinCode={initialJoinCode} 
                />;
      case GameState.LOBBY:
        if (gameSession && playerId) {
          return <LobbyScreen 
            gameCode={gameSession.gameCode!}
            players={gameSession.players || []}
            isHost={gameSession.hostId === playerId}
            onStartGame={handleStartOnlineGame}
            isLoading={isLoading}
          />;
        }
        return null;
      case GameState.GAME:
        if (gameSession) {
          return <GameScreen 
            session={gameSession} 
            playerId={playerId}
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
        return <StartScreen onStart={handleStart} onShowGallery={handleShowGallery} isLoading={isLoading} loadingMessage={loadingMessage} error={error} />;
    }
  }

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: '#f5f1e8', // A fallback color
    backgroundImage: `url('${backgroundImageData}')`,
    backgroundRepeat: 'repeat',
    backgroundAttachment: 'fixed',
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 pt-12 md:pt-20"
         style={backgroundStyle}>
      <header className="w-full max-w-5xl text-center mb-8 relative">
        <div className="inline-flex items-center gap-4">
           <Tooltip text="Back to homepage">
              <button
                onClick={handleResetGame}
                className="bg-transparent border-none p-0 cursor-pointer text-left"
                aria-label="Go to homepage"
              >
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight font-display">
                  {'Memory Trip'.split('').map((char, index) => (
                    <span key={index} style={{ color: titleColors[index % titleColors.length] }}>
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  ))}
                </h1>
              </button>
            </Tooltip>
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

export default App;