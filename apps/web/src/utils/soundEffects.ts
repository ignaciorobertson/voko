/**
 * Sound Effects Engine (ReactBits Sound Lab inspired)
 * Utiliza Web Audio API nativo para sintetizar sonidos orgánicos y táctiles
 * con latencia cero y sin dependencias de red o archivos de audio externos.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Control de sonido habilitado / silenciado (persistido en localStorage)
let soundEnabled = true;
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('voko_sound_enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('voko_sound_enabled', String(soundEnabled));
  }
  if (soundEnabled) {
    playDewSound(); // Feedback auditivo al activar
  }
  return soundEnabled;
}

/**
 * Sonido "Dew" (reactbits.dev/tools/sound-lab#sound=dew)
 * Sonido orgánico de gota / toque suave para clics normales de botones.
 */
export function playDewSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Oscilador principal
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';

  // Descenso exponencial de frecuencia característico de "Dew" (gota suave)
  osc.frequency.setValueAtTime(1050, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.055);

  // Envolvente de volumen: ataque rápido de 1.5ms y decaimiento suave de 55ms
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  // Filtro pasa-bajos suave para calidez acústica
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.065);
}

/**
 * Sonido "Clasp" (reactbits.dev/tools/sound-lab#sound=clasp)
 * Clic mecánico de acople táctil al activar o conmutar botones (ej: "Crear Cuenta").
 */
export function playClaspSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Primer transiente: chasquido agudo de contacto
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(2100, now);
  osc1.frequency.exponentialRampToValueAtTime(750, now + 0.018);

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.22, now + 0.0015);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.025);

  // 2. Segundo transiente: cuerpo de traba mecánica ligeramente retrasado (12ms)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(480, now + 0.012);
  osc2.frequency.exponentialRampToValueAtTime(160, now + 0.055);

  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.setValueAtTime(0.001, now + 0.012);
  gain2.gain.linearRampToValueAtTime(0.25, now + 0.015);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.012);
  osc2.stop(now + 0.065);
}

/**
 * Sonido "Unclasp" (reactbits.dev/tools/sound-lab#sound=unclasp)
 * Desacople mecánico / resorte al volver a "Iniciar Sesión".
 */
export function playUnclaspSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Transiente de desenganche: frecuencia que se abre hacia arriba con decaimiento elástico
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, now);
  osc.frequency.exponentialRampToValueAtTime(1450, now + 0.025);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.055);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  // Resonancia metálica sutil
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1100, now);
  filter.Q.setValueAtTime(2.5, now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.065);
}

