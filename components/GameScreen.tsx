


import React, { useState, useEffect, useRef } from 'react';
import { GameSession, AddedBy, GameMode, Player } from '../types';
import Button from './Button';
import Input from './Input';
import Card from './Card';
import Spinner from './Spinner';
import { playTimerWarning } from '../services/audioService';

// Fix: Add type definitions for Web Speech API as they are not included in default TS DOM typings.
interface SpeechRecognition {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly length: number;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
}

declare var SpeechRecognition: {
    new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
    new(): SpeechRecognition;
};

interface GameScreenProps {
  session: GameSession;
  playerId: string | null;
  onTakeTurn: (recalledItems: string, newItem: string) => void;
  onReset: () => void;
  onFinishTrip: () => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  showCorrectMessage: boolean;
}

const getTagInfo = (addedBy: AddedBy, gameMode: GameMode, players?: Player[]) => {
    // For online mode, try to find the player by their index (P1, P2...)
    if (gameMode === GameMode.ONLINE && players) {
        const playerIndex = parseInt(addedBy.split('_')[1]) - 1;
        if (players[playerIndex]) {
            return { text: players[playerIndex].name, className: 'bg-blue-600 text-white' };
        }
    }

    // Fallback for local modes or if player not found
    switch (addedBy) {
        case AddedBy.PLAYER_1:
            if (gameMode === GameMode.SINGLE_PLAYER || gameMode === GameMode.SOLO_MODE) {
                return { text: 'You', className: 'bg-blue-600 text-white' };
            }
            return { text: 'P1', className: 'bg-blue-600 text-white' };
        case AddedBy.PLAYER_2:
            return { text: 'P2', className: 'bg-purple-600 text-white' };
        case AddedBy.PLAYER_3:
            return { text: 'P3', className: 'bg-red-600 text-white' };
        case AddedBy.PLAYER_4:
            return { text: 'P4', className: 'bg-orange-600 text-white' };
        case AddedBy.AI:
            return { text: 'AI', className: 'bg-teal-500 text-white' };
        default:
            return { text: '', className: '' };
    }
}

const GameScreen: React.FC<GameScreenProps> = ({ session, playerId, onTakeTurn, onReset, onFinishTrip, isLoading, loadingMessage, error, showCorrectMessage }) => {
  const [recalledItems, setRecalledItems] = useState('');
  const [newItem, setNewItem] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechTarget, setSpeechTarget] = useState<'recalled' | 'new' | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechTargetRef = useRef(speechTarget);
  
  const isOnlineMode = session.gameMode === GameMode.ONLINE;
  const isSoloMode = session.gameMode === GameMode.SOLO_MODE;
  const isMyTurn = isOnlineMode ? session.currentPlayerId === playerId : true;


  useEffect(() => {
    setHint(null);
    setHintUsed(false);
  }, [session.currentPlayer, session.items.length, session.currentPlayerId]);

  useEffect(() => {
    speechTargetRef.current = speechTarget;
  }, [speechTarget]);

  useEffect(() => {
    if (!session.turnEndsAt || isLoading) {
      return;
    }

    const calculateSecondsLeft = () => {
        const now = Date.now();
        const remaining = Math.max(0, session.turnEndsAt! - now);
        setSecondsLeft(Math.ceil(remaining / 1000));
    };
    
    calculateSecondsLeft();
    
    const intervalId = setInterval(calculateSecondsLeft, 1000);

    return () => clearInterval(intervalId);
  }, [session.turnEndsAt, isLoading]);

  useEffect(() => {
    if (!isLoading && secondsLeft <= 10 && secondsLeft > 0) {
      playTimerWarning();
    }
  }, [secondsLeft, isLoading]);

  useEffect(() => {
    // Fix: Rename variable to avoid shadowing the 'SpeechRecognition' type.
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSpeechSupported(true);
      const recognition: SpeechRecognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[event.results.length - 1][0].transcript.replace(/\.$/, '');
        if (speechTargetRef.current === 'recalled') {
          setRecalledItems(prev => (prev ? prev + '\n' : '') + transcript);
        } else if (speechTargetRef.current === 'new') {
          setNewItem(transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setSpeechTarget(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechTarget(null);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech Recognition not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleMicToggle = (target: 'recalled' | 'new') => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setSpeechTarget(target);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Speech recognition could not be started: ", error);
        setIsListening(false);
        setSpeechTarget(null);
      }
    }
  };

  const handleRequestHint = () => {
    if (hintUsed || session.items.length === 0) return;
    const recalledSoFar = recalledItems.split('\n').map(i => i.trim()).filter(i => i);
    const nextItemIndex = recalledSoFar.length;
    if (nextItemIndex < session.items.length) {
      const nextItem = session.items[nextItemIndex];
      setHint(`The next item starts with: ${nextItem.text.charAt(0).toUpperCase()}`);
      setHintUsed(true);
    }
  };
  
  let turnTitle: string;
  if (isSoloMode) {
    turnTitle = "Solo Mode";
  } else if (isOnlineMode) {
    const currentPlayer = session.players?.find(p => p.id === session.currentPlayerId);
    turnTitle = isMyTurn ? "It's Your Turn!" : `Waiting for ${currentPlayer?.name || '...'}...`;
  } else if (session.gameMode === GameMode.SINGLE_PLAYER) {
    turnTitle = "Your Turn";
  } else {
    switch (session.currentPlayer) {
        case AddedBy.PLAYER_1: turnTitle = "Player 1's Turn"; break;
        case AddedBy.PLAYER_2: turnTitle = "Player 2's Turn"; break;
        case AddedBy.PLAYER_3: turnTitle = "Player 3's Turn"; break;
        case AddedBy.PLAYER_4: turnTitle = "Player 4's Turn"; break;
        default: turnTitle = "Next Turn";
    }
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      onTakeTurn(recalledItems, newItem.trim());
      setRecalledItems('');
      setNewItem('');
    }
  };

  const promptText = isSoloMode 
    ? `You're creating a scene in ${session.basePrompt}...` 
    : `You're going to ${session.basePrompt} and you're taking...`;
  const timerColor = secondsLeft <= 10 ? 'text-brand-secondary' : 'text-brand-text';
  const timerAnimation = secondsLeft <= 10 ? 'animate-pulse' : '';

  const showTimer = !isSoloMode && !isOnlineMode && session.turnEndsAt;


  return (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="md:col-span-1 p-4 bg-white shadow-lg transform -rotate-2">
        <div className="relative aspect-square w-full bg-brand-primary">
          <img
            src={`data:${session.mimeType};base64,${session.currentImage}`}
            alt={session.basePrompt}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
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
          {showCorrectMessage && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-white z-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-4xl font-bold font-display mt-4">Correct!</h3>
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white z-10">
              <Spinner />
              <p className="mt-4 text-center px-4">{loadingMessage}</p>
            </div>
          )}
        </div>
      </div>
      <Card className="md:col-span-1 flex flex-col h-full">
        <div className="p-6 flex-grow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold font-display">{turnTitle}</h2>
            {showTimer && (
                <div className={`text-2xl font-bold tabular-nums ${timerColor} ${timerAnimation}`}>
                  <span className="sr-only">Time left:</span>
                  {secondsLeft}
                </div>
              )}
          </div>
          <p className="text-brand-text-muted mb-4 italic">{promptText}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSoloMode && session.items.length > 0 && (
              <div>
                <div className="relative">
                    <textarea
                    value={recalledItems}
                    onChange={(e) => setRecalledItems(e.target.value)}
                    placeholder="First, recall all the items added so far, each on a new line..."
                    rows={session.items.length}
                    disabled={isLoading || !isMyTurn}
                    className={`w-full bg-brand-bg border border-brand-primary rounded-lg px-4 py-3 text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-shadow duration-200 disabled:bg-gray-200 ${isSpeechSupported ? 'pr-12' : ''}`}
                    />
                    {isSpeechSupported && (
                    <button
                        type="button"
                        onClick={() => handleMicToggle('recalled')}
                        disabled={isLoading || !isMyTurn}
                        className={`absolute top-3 right-0 flex items-center justify-center w-12 text-brand-text-muted hover:text-brand-text transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${isListening && speechTarget === 'recalled' ? 'text-brand-secondary' : ''}`}
                        aria-label={isListening && speechTarget === 'recalled' ? 'Stop listening' : 'Start listening to recall items'}
                    >
                        <svg className={`w-6 h-6 ${isListening && speechTarget === 'recalled' ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7v1h6v-1h-2v-2.07z" clipRule="evenodd"></path>
                        </svg>
                    </button>
                    )}
                </div>
                {hint && (
                  <p className="text-center text-brand-secondary font-semibold animate-fade-in-up mt-2">{hint}</p>
                )}
              </div>
            )}
            <div className="relative">
              <Input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={isMyTurn ? "...and what new item are you adding?" : "Waiting for other players..."}
                disabled={isLoading || !isMyTurn}
                className={isSpeechSupported ? 'pr-12' : ''}
              />
              {isSpeechSupported && (
                 <button
                    type="button"
                    onClick={() => handleMicToggle('new')}
                    disabled={isLoading || !isMyTurn}
                    className={`absolute inset-y-0 right-0 flex items-center justify-center w-12 text-brand-text-muted hover:text-brand-text transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${isListening && speechTarget === 'new' ? 'text-brand-secondary' : ''}`}
                    aria-label={isListening && speechTarget === 'new' ? 'Stop listening' : 'Start listening to add a new item'}
                  >
                    <svg className={`w-6 h-6 ${isListening && speechTarget === 'new' ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7v1h6v-1h-2v-2.07z" clipRule="evenodd"></path>
                    </svg>
                  </button>
              )}
            </div>
             <div className="flex flex-col sm:flex-row gap-4">
                <Button type="submit" disabled={isLoading || !newItem.trim() || !isMyTurn} className="flex-grow">
                    {isSoloMode ? 'Add Item' : 'Take Turn'}
                </Button>
                {!isSoloMode && session.items.length > 0 && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleRequestHint}
                        disabled={isLoading || hintUsed || !isMyTurn || (recalledItems.split('\n').filter(i => i.trim()).length >= session.items.length)}
                        className="flex-grow sm:flex-grow-0"
                        title="Get the first letter of the next item. One per turn!"
                    >
                        {hintUsed ? 'Hint Used' : 'Need a Hint?'}
                    </Button>
                )}
             </div>
            {error && <p className="mt-4 text-center text-red-400">{error}</p>}
          </form>
        </div>

        <div className="p-6 bg-brand-bg border-t border-brand-primary flex flex-col sm:flex-row gap-4 justify-between">
            <Button variant="secondary" onClick={() => setIsJournalOpen(!isJournalOpen)} className="w-full sm:w-auto">
                {isJournalOpen ? 'Hide' : 'Show'} Journal
            </Button>
            {isSoloMode ? (
                 <Button variant="secondary" onClick={onFinishTrip} className="w-full sm:w-auto">Finish Trip</Button>
            ) : (
                <Button variant="secondary" onClick={onReset} className="w-full sm:w-auto">Start New Trip</Button>
            )}
        </div>
        
        {isJournalOpen && (
            <div className="p-6 border-t border-brand-primary">
                <h3 className="text-xl font-bold font-display mb-2">Trip Journal</h3>
                <p className="text-sm text-brand-text-muted mb-4">You started your trip at: <span className="font-semibold">{session.basePrompt}</span></p>
                {session.items.length > 0 ? (
                    <ul className="space-y-2">
                        {session.items.map((item, index) => (
                            <li key={index} className="flex items-center gap-2 text-brand-text">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTagInfo(item.addedBy, session.gameMode, session.players).className}`}>
                                    {getTagInfo(item.addedBy, session.gameMode, session.players).text}
                                </span>
                                <span>{item.text}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-brand-text-muted italic">No items have been added to the journal yet.</p>
                )}
            </div>
        )}
      </Card>
    </div>
  );
};

export default GameScreen;