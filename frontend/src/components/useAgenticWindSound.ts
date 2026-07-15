import { useCallback, useRef } from 'react';

// Procedurally synthesises a soft, airy "breeze" with the Web Audio API - filtered noise, tightly
// band-limited (no harsh highs) with a slow gusting wobble - instead of shipping an audio asset.
// Browsers only allow an AudioContext to start after a user gesture; this lazily creates/resumes
// one on first call, so the very first scroll transition may stay silent if the visitor hasn't
// interacted with the page yet (unavoidable per browser autoplay policy), but every transition
// after any click/keypress/scroll plays normally.
export function useAgenticWindSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctxRef.current = new Ctor();
    return ctxRef.current;
  }, []);

  const playWhoosh = useCallback(() => {
    if (!enabled) return;
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const duration = 1.7;
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Cut the rumble below a breeze and, more importantly, tame the harsh hiss above it - a
      // wide-open high end is what made the first version sound like a broom on a floor.
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 140;
      highpass.Q.value = 0.4;

      const now = ctx.currentTime;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.Q.value = 0.35;
      lowpass.frequency.setValueAtTime(320, now);
      lowpass.frequency.linearRampToValueAtTime(820, now + duration * 0.4);
      lowpass.frequency.linearRampToValueAtTime(280, now + duration);

      // A second, gentler lowpass stage for a smoother roll-off than one filter alone gives.
      const lowpass2 = ctx.createBiquadFilter();
      lowpass2.type = 'lowpass';
      lowpass2.frequency.value = 1100;
      lowpass2.Q.value = 0.3;

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.0001, now);
      mainGain.gain.exponentialRampToValueAtTime(0.22, now + 0.4);
      mainGain.gain.exponentialRampToValueAtTime(0.13, now + duration * 0.6);
      mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // A slow wobble on the gain - a real gust of wind swells and eases rather than holding one
      // flat level - rather than the earlier static, unwavering whoosh.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 2.1;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.04;
      lfo.connect(lfoDepth);
      lfoDepth.connect(mainGain.gain);

      noise.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(lowpass2);
      lowpass2.connect(mainGain);
      mainGain.connect(ctx.destination);

      noise.start(now);
      lfo.start(now);
      noise.stop(now + duration);
      lfo.stop(now + duration);
    } catch {
      // Best-effort sound effect - silently do nothing if the browser refuses.
    }
  }, [enabled, getContext]);

  return playWhoosh;
}
