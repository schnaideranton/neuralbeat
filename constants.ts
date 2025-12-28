import { Instrument, InstrumentType, EffectSettings, Preset, SynthParams } from './types';

export const STEPS = 16;
export const DEFAULT_BPM = 120;

export const INSTRUMENTS: Instrument[] = [
  { id: 0, name: 'KICK', type: InstrumentType.KICK, color: 'text-neon-pink border-neon-pink shadow-[0_0_10px_#ff00ff]' },
  { id: 1, name: 'SNARE', type: InstrumentType.SNARE, color: 'text-neon-blue border-neon-blue shadow-[0_0_10px_#00ffff]' },
  { id: 2, name: 'HI-HAT', type: InstrumentType.HIHAT, color: 'text-neon-green border-neon-green shadow-[0_0_10px_#39ff14]' },
  { id: 3, name: 'CLAP', type: InstrumentType.CLAP, color: 'text-neon-purple border-neon-purple shadow-[0_0_10px_#bf00ff]' },
  { id: 4, name: 'BASS', type: InstrumentType.BASS, color: 'text-indigo-400 border-indigo-400 shadow-[0_0_10px_#818cf8]' },
  { id: 5, name: 'LEAD', type: InstrumentType.LEAD, color: 'text-yellow-400 border-yellow-400 shadow-[0_0_10px_#facc15]' },
];

export const DEFAULT_EFFECTS: EffectSettings = {
  distortion: 0,
  filterFreq: 20000,
  filterRes: 0,
  delayTime: 0,
  delayFeedback: 0,
  reverbMix: 0,
  volume: 0.8
};

export const DEFAULT_SYNTH: SynthParams = {
  tone: 0.5,
  decay: 0.5,
  punch: 0.5,
  timbre: 0.5
};

export const INITIAL_GRID = Array(INSTRUMENTS.length)
  .fill(null)
  .map(() => Array(STEPS).fill(false));

export const PRESETS: Preset[] = [
  {
    name: "Classic House",
    bpm: 124,
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Hat
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Clap
      [false, false, true, false, false, false, false, false, true, false, false, false, false, false, false, false], // Bass
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false], // Lead
    ]
  },
  {
    name: "Hip Hop Basic",
    bpm: 90,
    grid: [
      [true, false, false, false, false, false, false, true, false, false, true, false, false, false, false, false], // Kick
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], // Hat
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Clap
      [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false], // Bass
      [false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false], // Lead
    ]
  },
  {
    name: "Techno Rumble",
    bpm: 135,
    grid: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Snare
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], // Hat
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Clap
      [false, true, true, false, false, true, true, false, false, true, true, false, false, true, true, false], // Bass
      [false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false], // Lead
    ]
  },
  {
    name: "DnB Stepper",
    bpm: 174,
    grid: [
      [true, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false], // Kick
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], // Hat
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], // Clap
      [true, false, false, false, false, false, true, false, true, false, false, false, false, false, false, false], // Bass
      [false, false, false, true, false, false, false, false, false, false, true, false, false, true, false, false], // Lead
    ]
  }
];