
import React, { useState, useEffect, useRef } from 'react';
import { GameSession, AddedBy, GameMode } from '../types';
import Button from './Button';
import Input from './Input';
import Card from './Card';
import Spinner from './Spinner';
import { playTimerWarning } from '../services/audioService';

interface GameScreenProps {
  session: GameSession;
  onTakeTurn: (recalledItems: string, newItem: string) => void;
  onReset: () => void;
  onFinishTrip: () => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  showCorrectMessage: boolean;
}

// Fix: Define TypeScript interfaces for the Web Speech API to avoid type errors.
// These are not included in default TS DOM typings and are needed for the component to compile.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

const getTagInfo = (addedBy: AddedBy, gameMode: GameMode) => {
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

const GameScreen: React.FC<GameScreenProps> = ({ session, onTakeTurn, onReset, onFinishTrip, isLoading, loadingMessage, error, showCorrectMessage }) => {
  const [recalledItems, setRecalledItems] = useState('');
  const [newItem, setNewItem] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechTarget, setSpeechTarget] = useState<'recalled' | 'new' | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isJournalOpen, setIsJournalOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechTargetRef = useRef(speechTarget);
  const isSoloMode = session.gameMode === GameMode.SOLO_MODE;

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
    // Play timer warning sound when 10s or less remain, not loading, and not at 0.
    if (!isLoading && secondsLeft <= 10 && secondsLeft > 0) {
      playTimerWarning();
    }
  }, [secondsLeft, isLoading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition: SpeechRecognition = new SpeechRecognition();
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

    // Cleanup on unmount
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
  
  let turnTitle: string;
  if (isSoloMode) {
    turnTitle = "Solo Mode";
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


  return (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="md:col-span-1 p-4 bg-white shadow-lg transform -rotate-2">
        <div className="relative aspect-square w-full bg-brand-primary">
          <img
            src={`data:${session.mimeType};base64,${session.currentImage}`}
            alt={session.basePrompt}
            className="w-full h-full object-cover transition-opacity duration-300"
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
            {!isSoloMode && session.turnEndsAt && (
                <div className={`text-2xl font-bold tabular-nums ${timerColor} ${timerAnimation}`}>
                  <span className="sr-only">Time left:</span>
                  {secondsLeft}
                </div>
              )}
          </div>
          <p className="text-brand-text-muted mb-4 italic">{promptText}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSoloMode && session.items.length > 0 && (
              <div className="relative">
                <textarea
                  value={recalledItems}
                  onChange={(e) => setRecalledItems(e.target.value)}
                  placeholder="First, recall all the items added so far, each on a new line..."
                  rows={session.items.length}
                  disabled={isLoading}
                  className={`w-full bg-brand-bg border border-brand-primary rounded-lg px-4 py-3 text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-shadow duration-200 ${isSpeechSupported ? 'pr-12' : ''}`}
                />
                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={() => handleMicToggle('recalled')}
                    disabled={isLoading}
                    className={`absolute top-3 right-0 flex items-center justify-center w-12 text-brand-text-muted hover:text-brand-text transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${isListening && speechTarget === 'recalled' ? 'text-brand-secondary' : ''}`}
                    aria-label={isListening && speechTarget === 'recalled' ? 'Stop listening' : 'Start listening to recall items'}
                  >
                    <svg className={`w-6 h-6 ${isListening && speechTarget === 'recalled' ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7v1h6v-1h-2v-2.07z" clipRule="evenodd"></path>
                    </svg>
                  </button>
                )}
              </div>
            )}
            <div className="relative">
              <Input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="...and what new item are you adding?"
                disabled={isLoading}
                className={isSpeechSupported ? 'pr-12' : ''}
              />
              {isSpeechSupported && (
                 <button
                    type="button"
                    onClick={() => handleMicToggle('new')}
                    disabled={isLoading}
                    className={`absolute inset-y-0 right-0 flex items-center justify-center w-12 text-brand-text-muted hover:text-brand-text transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${isListening && speechTarget === 'new' ? 'text-brand-secondary' : ''}`}
                    aria-label={isListening && speechTarget === 'new' ? 'Stop listening' : 'Start listening to add a new item'}
                  >
                    <svg className={`w-6 h-6 ${isListening && speechTarget === 'new' ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7v1h6v-1h-2v-2.07z" clipRule="evenodd"></path>
                    </svg>
                  </button>
              )}
            </div>
            <Button type="submit" disabled={isLoading || !newItem.trim()}>
                {isSoloMode ? 'Add Item' : 'Take Turn'}
            </Button>
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
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTagInfo(item.addedBy, session.gameMode).className}`}>
                                    {getTagInfo(item.addedBy, session.gameMode).text}
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