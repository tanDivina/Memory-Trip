
// A simple service to play sound effects using the Web Audio API.

// Create a single AudioContext to be reused.
// It's initialized on the first sound play to ensure it's created after user interaction.
let audioContext: AudioContext | null = null;
let soundEnabled = true;

export const setSoundEnabled = (isEnabled: boolean) => {
  soundEnabled = isEnabled;
};

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  // Initialize on first use
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API is not supported in this browser.");
      return null;
    }
  }
  return audioContext;
};

// A generic function to play a sound with a given frequency, duration, and type.
const playSound = (
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number = 0.3
) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Browsers may require a user interaction to start the AudioContext.
  if (ctx.state === 'suspended') {
      ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  // Start with the desired volume and fade out to avoid clicks
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration / 1000);
};

export const playCorrectSound = () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // A short, sharp "correct" sound
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    osc.frequency.setValueAtTime(1046.50, now); // C6
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
};

export const playTimerWarning = () => {
  if (!soundEnabled) return;
  playSound(900, 100, 'triangle', 0.2); // A high-pitched, short beep
};

export const playTurnSuccess = () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // A short, ascending "success" chime
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.linearRampToValueAtTime(783.99, now + 0.15); // G5
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
};

export const playGameOver = () => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // A longer, descending "failure" sound
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    osc.frequency.setValueAtTime(349.23, now); // F4
    osc.frequency.exponentialRampToValueAtTime(130.81, now + 0.7); // C3
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.start(now);
    osc.stop(now + 0.8);
};
