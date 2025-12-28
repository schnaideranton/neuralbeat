export enum InstrumentType {
  KICK = 'KICK',
  SNARE = 'SNARE',
  HIHAT = 'HIHAT',
  CLAP = 'CLAP',
  BASS = 'BASS',
  LEAD = 'LEAD',
}

export interface Instrument {
  id: number;
  name: string;
  type: InstrumentType;
  color: string; // Tailwind color class snippet
}

export interface EffectSettings {
  distortion: number; // 0 - 1.0
  filterFreq: number; // 20 - 20000 Hz
  filterRes: number;  // 0 - 20
  delayTime: number;  // 0 - 1.0 s
  delayFeedback: number; // 0 - 0.9
  reverbMix: number;  // 0 - 1.0
  volume: number; // 0 - 1.0
}

export interface SynthParams {
  tone: number;   // 0.0 - 1.0 (Frequency / Pitch)
  decay: number;  // 0.0 - 1.0 (Length)
  punch: number;  // 0.0 - 1.0 (Attack / Mod Depth)
  timbre: number; // 0.0 - 1.0 (Color / Waveform)
}

export interface TrackSettings {
  synth: SynthParams;
  effects: EffectSettings;
  muted: boolean;
}

export type GridState = boolean[][];

export interface Preset {
  name: string;
  grid: GridState;
  bpm: number;
}