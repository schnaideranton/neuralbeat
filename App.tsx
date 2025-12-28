import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INSTRUMENTS, INITIAL_GRID, DEFAULT_BPM, STEPS, DEFAULT_EFFECTS, PRESETS, DEFAULT_SYNTH } from './constants';
import { SequencerRow } from './components/SequencerRow';
import { Controls } from './components/Controls';
import { GridState, TrackSettings, InstrumentType } from './types';
import { audioEngine } from './services/audioEngine';

// Pentatonic Scale (A Minor) for melodies
const SCALE_BASS = [55, 65.41, 73.42, 82.41, 98]; // A1, C2, D2, E2, G2
const SCALE_LEAD = [220, 246.94, 261.63, 293.66, 329.63, 392, 440]; // A3...

const App: React.FC = () => {
  const [grid, setGrid] = useState<GridState>(INITIAL_GRID);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [presetIndex, setPresetIndex] = useState<number>(-1);
  
  // Melodies for Bass (idx 4) and Lead (idx 5)
  const [melodies, setMelodies] = useState<number[][]>(
    INSTRUMENTS.map(() => Array(STEPS).fill(0))
  );

  const [trackSettings, setTrackSettings] = useState<TrackSettings[]>(
    INSTRUMENTS.map(() => ({
      synth: { ...DEFAULT_SYNTH },
      effects: { ...DEFAULT_EFFECTS },
      muted: false
    }))
  );
  
  const timerRef = useRef<number | null>(null);
  const currentStepRef = useRef(0);
  
  useEffect(() => {
    trackSettings.forEach((settings, index) => {
      audioEngine.updateTrackSettings(INSTRUMENTS[index].type, settings.effects);
    });
  }, [trackSettings]);

  const toggleCell = (rowIdx: number, stepIdx: number) => {
    audioEngine.init();
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[rowIdx][stepIdx] = !newGrid[rowIdx][stepIdx];
      return newGrid;
    });
    setPresetIndex(-1);
  };

  const handleSettingsChange = (rowIdx: number, newSettings: TrackSettings) => {
    setTrackSettings(prev => {
      const updated = [...prev];
      updated[rowIdx] = newSettings;
      return updated;
    });
  };

  const playStep = useCallback((step: number) => {
    grid.forEach((row, rowIdx) => {
      if (row[step]) {
        const inst = INSTRUMENTS[rowIdx];
        const settings = trackSettings[rowIdx];
        const freq = melodies[rowIdx][step];
        if (!settings.muted) {
            audioEngine.playSound(inst.type, settings.synth, freq > 0 ? freq : undefined);
        }
      }
    });
    setCurrentStep(step);
    currentStepRef.current = step;
  }, [grid, trackSettings, melodies]);

  useEffect(() => {
    if (isPlaying) {
      const stepTime = (60 * 1000) / bpm / 4; 
      const loop = () => {
        playStep(currentStepRef.current);
        const nextStep = (currentStepRef.current + 1) % STEPS;
        currentStepRef.current = nextStep;
        timerRef.current = window.setTimeout(loop, stepTime);
      };
      loop();
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [isPlaying, bpm, playStep]);

  const handlePlayToggle = () => {
    audioEngine.init();
    setIsPlaying(!isPlaying);
  };

  const getRandomTrackSettings = (type: InstrumentType, existing: TrackSettings): TrackSettings => {
    const rnd = Math.random;
    const synth = { ...existing.synth };
    const effects = { ...existing.effects };
    switch (type) {
      case InstrumentType.KICK:
        synth.tone = 0.1 + rnd() * 0.4;
        synth.decay = 0.3 + rnd() * 0.5;
        synth.punch = 0.5 + rnd() * 0.5;
        synth.timbre = rnd() * 0.4;
        effects.filterFreq = 800 + rnd() * 4000;
        effects.distortion = rnd() * 0.2;
        break;
      case InstrumentType.BASS:
        synth.tone = rnd() * 0.3;
        synth.decay = 0.2 + rnd() * 0.6;
        synth.punch = 0.3 + rnd() * 0.7;
        synth.timbre = rnd() > 0.5 ? 0.2 : 0.8;
        effects.filterFreq = 150 + rnd() * 1000;
        effects.distortion = rnd() * 0.3;
        break;
      case InstrumentType.SNARE:
      case InstrumentType.CLAP:
        synth.tone = 0.4 + rnd() * 0.4;
        synth.decay = 0.1 + rnd() * 0.3;
        synth.punch = 0.4 + rnd() * 0.6;
        synth.timbre = 0.3 + rnd() * 0.5;
        effects.filterFreq = 1500 + rnd() * 6000;
        effects.distortion = rnd() * 0.4;
        break;
      case InstrumentType.HIHAT:
        synth.tone = 0.7 + rnd() * 0.3;
        synth.decay = 0.05 + rnd() * 0.2;
        synth.punch = 0.4 + rnd() * 0.6;
        synth.timbre = 0.5 + rnd() * 0.5;
        effects.filterFreq = 5000 + rnd() * 10000;
        effects.distortion = 0;
        break;
      case InstrumentType.LEAD:
        synth.tone = 0.2 + rnd() * 0.6;
        synth.decay = 0.3 + rnd() * 0.7;
        synth.punch = rnd() * 0.5;
        synth.timbre = rnd();
        effects.filterFreq = 2000 + rnd() * 8000;
        effects.reverbMix = 0.2 + rnd() * 0.5;
        break;
    }
    return { ...existing, synth, effects };
  };

  const handleRandomizeTrack = (index: number) => {
    setTrackSettings(prev => {
      const updated = [...prev];
      updated[index] = getRandomTrackSettings(INSTRUMENTS[index].type, updated[index]);
      return updated;
    });
  };

  // Generative "Classic" Logic
  const generateIntelligentPattern = () => {
    const newGrid = INITIAL_GRID.map(() => Array(STEPS).fill(false));
    const newMelodies = INITIAL_GRID.map(() => Array(STEPS).fill(0));
    
    // Kick: 1, 5, 9, 13
    for(let i=0; i<STEPS; i+=4) newGrid[0][i] = true;
    if (Math.random() > 0.5) newGrid[0][10] = true;

    // Snare: 5, 13
    newGrid[1][4] = true;
    newGrid[1][12] = true;

    // Hihat: 16ths or 8ths
    const hatMode = Math.random() > 0.5 ? 2 : 1;
    for(let i=0; i<STEPS; i+=hatMode) newGrid[2][i] = true;

    // Bass: Syncopated
    let bassNoteIdx = Math.floor(Math.random() * SCALE_BASS.length);
    for(let i=0; i<STEPS; i++) {
        if (Math.random() > 0.7) {
            newGrid[4][i] = true;
            if (Math.random() > 0.6) bassNoteIdx = (bassNoteIdx + (Math.random() > 0.5 ? 1 : -1) + SCALE_BASS.length) % SCALE_BASS.length;
            newMelodies[4][i] = SCALE_BASS[bassNoteIdx];
        }
    }

    // Lead: Harmonious Melody
    let leadNoteIdx = Math.floor(Math.random() * SCALE_LEAD.length);
    for(let i=0; i<STEPS; i++) {
        if (Math.random() > 0.75) {
            newGrid[5][i] = true;
            // Melodic walk
            const walk = Math.random() > 0.5 ? 1 : -1;
            leadNoteIdx = (leadNoteIdx + walk + SCALE_LEAD.length) % SCALE_LEAD.length;
            newMelodies[5][i] = SCALE_LEAD[leadNoteIdx];
        }
    }

    setGrid(newGrid);
    setMelodies(newMelodies);
    setPresetIndex(-1);
  };

  const handleRandomize = () => {
    generateIntelligentPattern();
    handleRandomizeSounds();
  };

  const handleRandomizeSounds = () => {
    setTrackSettings(prev => prev.map((track, i) => getRandomTrackSettings(INSTRUMENTS[i].type, track)));
  };

  const handleRandomizeEffects = () => {
     setTrackSettings(prev => prev.map(track => ({
        ...track,
        effects: {
            ...track.effects,
            filterFreq: 500 + Math.random() * 14000,
            filterRes: Math.random() * 8,
            distortion: Math.random() > 0.7 ? Math.random() * 0.4 : 0,
            delayTime: Math.random() > 0.6 ? Math.random() * 0.3 : 0,
            delayFeedback: Math.random() * 0.4,
            reverbMix: Math.random() * 0.5
        }
    })));
  };

  const handlePreset = () => {
    generateIntelligentPattern();
  };

  const handleClear = () => {
    setGrid(INITIAL_GRID);
    setMelodies(INSTRUMENTS.map(() => Array(STEPS).fill(0)));
    setPresetIndex(-1);
    setCurrentStep(0);
    currentStepRef.current = 0;
  };

  return (
    <div className="min-h-screen bg-page-bg text-page-text font-mono p-4 md:p-12 lg:p-24 selection:bg-page-accent selection:text-black">
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-12 border-b-2 border-white pb-4">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tighter">NEURAL_BEAT_GEN.TSX</h1>
          <p className="text-sm text-page-dim">
            // MELODIC & INTELLIGENT SEQUENCER
            <br/>
            // COPYRIGHT (C) 2024 NEURAL CORP
          </p>
        </div>

        <Controls 
          isPlaying={isPlaying}
          bpm={bpm}
          currentPresetName={presetIndex >= 0 ? PRESETS[presetIndex].name : "Generative Classic"}
          onPlayToggle={handlePlayToggle}
          onBpmChange={setBpm}
          onRandomize={handleRandomize}
          onRandomizeSounds={handleRandomizeSounds}
          onRandomizeEffects={handleRandomizeEffects}
          onPreset={handlePreset}
          onClear={handleClear}
        />

        <div className="space-y-2">
          <h2 className="text-xl text-white mb-8 underline decoration-wavy decoration-page-dim underline-offset-8">
            PATTERN_SEQUENCE_DATA & PARAMETERS:
          </h2>
          
          {INSTRUMENTS.map((inst, index) => (
            <SequencerRow
              key={inst.id}
              instrument={inst}
              rowState={grid[index]}
              currentStep={currentStep}
              settings={trackSettings[index]}
              onToggle={(step) => toggleCell(index, step)}
              onSettingsChange={(newSettings) => handleSettingsChange(index, newSettings)}
              onRandomizeTrack={() => handleRandomizeTrack(index)}
            />
          ))}
        </div>

        <div className="mt-24 pt-8 border-t border-page-dim/30 text-xs text-page-dim flex justify-between">
          <span>STATUS: ONLINE</span>
          <span>MEMORY: 512KB OK</span>
        </div>
      </div>
    </div>
  );
};

export default App;