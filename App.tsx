import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INSTRUMENTS, INITIAL_GRID, DEFAULT_BPM, STEPS, PRESETS, DEFAULT_EFFECTS, DEFAULT_SYNTH } from './constants';
import { SequencerRow } from './components/SequencerRow';
import { Controls } from './components/Controls';
import { GridState, TrackSettings } from './types';
import { audioEngine } from './services/audioEngine';

const App: React.FC = () => {
  const [grid, setGrid] = useState<GridState>(INITIAL_GRID);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [currentPresetIndex, setCurrentPresetIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([
    "CORE_INIT: SUCCESS",
    "AUDIO_ENGINE: READY",
    "STANDING BY FOR SEQUENCE_START..."
  ]);
  const [trackSettings, setTrackSettings] = useState<TrackSettings[]>(
    INSTRUMENTS.map(() => ({
      synth: { ...DEFAULT_SYNTH },
      effects: { ...DEFAULT_EFFECTS },
      muted: false
    }))
  );
  
  const timerRef = useRef<number | null>(null);
  const currentStepRef = useRef(0);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  useEffect(() => {
    trackSettings.forEach((settings, index) => {
      audioEngine.updateTrackSettings(INSTRUMENTS[index].type, settings.effects);
    });
  }, [trackSettings]);

  const playStep = useCallback((step: number) => {
    grid.forEach((row, rowIdx) => {
      if (row[step]) {
        const inst = INSTRUMENTS[rowIdx];
        const settings = trackSettings[rowIdx];
        audioEngine.playSound(inst.type, settings.synth);
      }
    });
    setCurrentStep(step);
    currentStepRef.current = step;
  }, [grid, trackSettings]);

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
    }
  }, [isPlaying, bpm, playStep]);

  const handlePlayToggle = () => {
    audioEngine.init();
    const newState = !isPlaying;
    setIsPlaying(newState);
    addLog(newState ? ">> EXECUTION_STARTED" : ">> EXECUTION_HALTED");
  };

  const handleScatter16 = () => {
    audioEngine.init();
    // Создаем пустую сетку
    const newGrid = Array(INSTRUMENTS.length).fill(null).map(() => Array(STEPS).fill(false));
    let placed = 0;
    // Раскидываем ровно 16 нот в случайные места
    while (placed < 16) {
      const r = Math.floor(Math.random() * INSTRUMENTS.length);
      const c = Math.floor(Math.random() * STEPS);
      if (!newGrid[r][c]) {
        newGrid[r][c] = true;
        placed++;
      }
    }
    setGrid(newGrid);
    addLog(">> TRIGGERED: RANDOM_SCATTER_16_MAP");
    setCurrentPresetIndex(-1);
  };

  const handleNextPreset = () => {
    audioEngine.init();
    const nextIdx = (currentPresetIndex + 1) % PRESETS.length;
    const preset = PRESETS[nextIdx];
    setGrid(preset.grid);
    setBpm(preset.bpm);
    setCurrentPresetIndex(nextIdx);
    addLog(`>> LOADING_PRESET: ${preset.name.toUpperCase()}`);
  };

  const handleClear = () => {
    setGrid(Array(INSTRUMENTS.length).fill(null).map(() => Array(STEPS).fill(false)));
    addLog(">> BUFFER_CLEARED");
    setCurrentPresetIndex(-1);
    setCurrentStep(0);
    currentStepRef.current = 0;
  };

  return (
    <div className="min-h-screen bg-page-bg text-gray-400 font-mono p-4 md:p-10 selection:bg-page-accent selection:text-black">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-8 border border-page-dim p-4 bg-black relative">
          <div className="flex justify-between items-center mb-4 border-b border-page-dim pb-2 font-bold">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-page-accent animate-pulse"></div>
              <h1 className="text-sm tracking-widest text-white uppercase">Neural_Beat // System_Control</h1>
            </div>
            <div className="text-[10px] text-page-dim uppercase flex gap-4">
              <span>Status: {isPlaying ? 'ACTIVE' : 'IDLE'}</span>
              <span>Memory: OK</span>
            </div>
          </div>
          
          <div className="text-[11px] leading-relaxed overflow-hidden h-24 flex flex-col-reverse opacity-90">
            <div className="text-page-accent mt-1">
              $ <span className="cursor-blink">_</span>
            </div>
            {logs.map((line, i) => (
              <div key={i} className={i === 0 ? 'text-white' : 'text-page-dim'}>
                [{new Date().toLocaleTimeString()}] {line}
              </div>
            ))}
          </div>
        </header>

        <Controls 
          isPlaying={isPlaying}
          bpm={bpm}
          onPlayToggle={handlePlayToggle}
          onBpmChange={setBpm}
          onPreset={handleNextPreset}
          onClear={handleClear}
          onScatter16={handleScatter16}
          onRandomize={() => {}}
          onRandomizeSounds={() => addLog(">> RE-SYNTH_TRACKS...")}
          onRandomizeEffects={() => {}}
        />

        <div className="space-y-4">
          {INSTRUMENTS.map((inst, index) => (
            <SequencerRow
              key={inst.id}
              instrument={inst}
              rowState={grid[index]}
              currentStep={currentStep}
              settings={trackSettings[index]}
              onToggle={(step) => {
                const newGrid = [...grid];
                const newRow = [...newGrid[index]];
                newRow[step] = !newRow[step];
                newGrid[index] = newRow;
                setGrid(newGrid);
              }}
              onSettingsChange={(newSettings) => {
                const newTracks = [...trackSettings];
                newTracks[index] = newSettings;
                setTrackSettings(newTracks);
              }}
              onRandomizeTrack={() => {
                const newTracks = [...trackSettings];
                newTracks[index].synth = {
                  tone: Math.random(),
                  decay: Math.random(),
                  punch: Math.random(),
                  timbre: Math.random()
                };
                setTrackSettings(newTracks);
                addLog(`>> VOX_MOD: ${inst.name}`);
              }}
            />
          ))}
        </div>

        <footer className="mt-16 pt-4 border-t border-page-dim text-[9px] text-page-dim flex justify-between uppercase tracking-widest font-bold">
          <span>Engine_v1.0.9 // Root@NeuralMachine</span>
          <span>&copy; 2024 // {bpm} BPM</span>
        </footer>
      </div>
    </div>
  );
};

export default App;
