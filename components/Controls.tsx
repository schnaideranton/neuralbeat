import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  bpm: number;
  onPlayToggle: () => void;
  onBpmChange: (bpm: number) => void;
  onRandomize: () => void;
  onRandomizeSounds: () => void;
  onRandomizeEffects: () => void;
  onPreset: () => void;
  onClear: () => void;
  onScatter16: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  bpm,
  onPlayToggle,
  onBpmChange,
  onPreset,
  onClear,
  onScatter16
}) => {
  return (
    <div className="mb-10 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-8 items-center border border-page-dim p-6 bg-black">
      {/* PLAY BUTTON */}
      <button 
        onClick={onPlayToggle}
        className={`h-14 px-10 font-black text-xs border transition-all ${isPlaying ? 'bg-red-900/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-page-accent border-page-accent text-black hover:bg-white hover:border-white'}`}
      >
        {isPlaying ? '[ TERMINATE ]' : '[ EXECUTE ]'}
      </button>

      {/* TEMPO SLIDER */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[10px] uppercase text-page-dim font-black">
          <span>Clock_Frequency</span>
          <span className="text-page-accent">{bpm} BPM</span>
        </div>
        <input 
          type="range" min="60" max="220" value={bpm} 
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* MODE SELECTORS */}
      <div className="flex gap-2">
        <button 
          onClick={onPreset}
          className="h-14 px-4 border border-page-dim text-[10px] font-black hover:border-page-accent hover:text-white transition-colors"
        >
          CLASSIC_MODES
        </button>
        <button 
          onClick={onScatter16}
          className="h-14 px-6 bg-page-highlight text-black font-black text-[10px] hover:bg-page-accent transition-all shadow-[4px_4px_0px_rgba(74,222,128,0.5)]"
        >
          SCATTER_16
        </button>
        <button 
          onClick={onClear} 
          className="h-14 px-4 border border-red-900/40 text-red-900 hover:text-red-500 hover:bg-red-500/5 text-[10px] font-bold"
        >
          CLS
        </button>
      </div>
    </div>
  );
};
