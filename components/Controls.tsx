import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  bpm: number;
  currentPresetName?: string;
  onPlayToggle: () => void;
  onBpmChange: (bpm: number) => void;
  onRandomize: () => void;
  onRandomizeSounds: () => void;
  onRandomizeEffects: () => void;
  onPreset: () => void;
  onClear: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  bpm,
  currentPresetName,
  onPlayToggle,
  onBpmChange,
  onRandomize,
  onRandomizeSounds,
  onRandomizeEffects,
  onPreset,
  onClear
}) => {
  return (
    <div className="mb-12 text-base md:text-lg leading-loose border-b border-page-dim pb-8">
      <p className="inline">
        <span className="text-page-dim mr-2">&gt;</span>
        System status is currently 
        <button 
          onClick={onPlayToggle}
          className={`mx-2 px-1 border-b-2 hover:bg-page-dim/20 transition-all font-bold ${isPlaying ? 'border-page-accent text-page-accent' : 'border-page-dim text-page-dim'}`}
        >
          [{isPlaying ? ' PLAYING ' : ' STOPPED '}]
        </button>.
      </p>
      
      <p className="inline mt-2 md:mt-0">
        The master clock is set to 
        <span className="mx-2 font-bold text-page-highlight inline-flex items-center gap-2 border-b border-dashed border-page-dim">
            {bpm} BPM
            <input
                type="range"
                min="60"
                max="240"
                value={bpm}
                onChange={(e) => onBpmChange(Number(e.target.value))}
                className="w-24 opacity-50 hover:opacity-100 transition-opacity"
            />
        </span>.
      </p>

      <p className="mt-4">
        <span className="text-page-dim mr-2">&gt;</span>
        Configuration: Load 
        <button 
          onClick={onPreset} 
          className="mx-1 hover:text-white text-page-accent underline decoration-dotted underline-offset-4"
        >
          {currentPresetName || 'a preset pattern'}
        </button>.
        
        <br className="md:hidden" />
        
        <span className="text-page-dim ml-0 md:ml-2">::</span> Generators:
        <button 
          onClick={onRandomize} 
          className="mx-2 hover:text-white text-page-highlight underline decoration-dotted underline-offset-4"
        >
          Full RND
        </button>
        /
         <button 
          onClick={onRandomizeSounds} 
          className="mx-2 hover:text-yellow-400 text-yellow-600 underline decoration-dotted underline-offset-4"
          title="Randomize Synth Params Only"
        >
          RND Sounds
        </button>
        /
         <button 
          onClick={onRandomizeEffects} 
          className="mx-2 hover:text-indigo-400 text-indigo-600 underline decoration-dotted underline-offset-4"
           title="Randomize FX Chain Only"
        >
          RND Effects
        </button>
        
        <br className="block my-2" />
        <span className="text-page-dim">&gt;</span>
        To reset, 
        <button 
          onClick={onClear} 
          className="mx-1 hover:text-red-400 text-page-dim underline decoration-dotted underline-offset-4"
        >
          clear all data
        </button>.
      </p>
    </div>
  );
};