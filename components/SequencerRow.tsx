import React from 'react';
import { Instrument, TrackSettings, SynthParams } from '../types';
import { STEPS } from '../constants';

interface SequencerRowProps {
  instrument: Instrument;
  rowState: boolean[];
  currentStep: number;
  settings: TrackSettings;
  onToggle: (step: number) => void;
  onSettingsChange: (settings: TrackSettings) => void;
  onRandomizeTrack: () => void;
}

export const SequencerRow: React.FC<SequencerRowProps> = ({
  instrument,
  rowState,
  currentStep,
  settings,
  onToggle,
  onSettingsChange,
  onRandomizeTrack,
}) => {
  
  const handleSynthChange = (key: keyof SynthParams, value: number) => {
    onSettingsChange({
      ...settings,
      synth: { ...settings.synth, [key]: value }
    });
  };

  const handleEffectChange = (key: keyof TrackSettings['effects'], value: number) => {
    onSettingsChange({
      ...settings,
      effects: { ...settings.effects, [key]: value }
    });
  };

  return (
    <div className="mb-10 group">
      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-4 mb-3">
        
        {/* LEFT COL: Instrument Name + Info (Fixed Width for Alignment) */}
        <div className="flex flex-col justify-center border-l-4 border-page-dim pl-3 h-full">
          <div className="flex items-baseline justify-between pr-4">
             <div className="flex items-baseline gap-2">
                <span className="text-xs text-page-dim">CH_0{instrument.id + 1}</span>
                <span className={`text-xl font-bold tracking-widest ${instrument.color.split(' ')[0]}`}>{instrument.name}</span>
             </div>
             <button 
               onClick={onRandomizeTrack}
               className="text-[10px] text-page-dim hover:text-page-accent border border-page-dim/30 px-1 rounded hover:border-page-accent transition-colors"
               title="Randomize this track's sound"
             >
               RND_SND
             </button>
          </div>
          <div className="text-[10px] text-page-dim font-mono mt-1">
             SYNTH_ENGINE_ACTIVE
          </div>
        </div>

        {/* RIGHT COL: Grid of Bullets */}
        <div className="flex items-center justify-between select-none px-2 h-full">
          {Array.from({ length: STEPS }).map((_, index) => {
            const isActive = rowState[index];
            const isCurrent = currentStep === index;
            
            return (
              <button
                key={index}
                onClick={() => onToggle(index)}
                className={`
                  w-8 h-8 flex items-center justify-center text-xl transition-all rounded hover:bg-white/5
                  ${isCurrent ? 'text-white font-black scale-110' : ''}
                  ${!isCurrent && isActive ? 'text-page-accent' : ''}
                  ${!isCurrent && !isActive ? 'text-page-dim/40' : ''}
                `}
                title={`Step ${index + 1}`}
              >
                {isActive ? '■' : '·'}
              </button>
            );
          })}
        </div>
      </div>

      {/* PARAMETERS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 text-xs text-gray-400 bg-page-dim/5 p-4 rounded-sm border border-page-dim/10">
        
        {/* SYNTHESIS PARAMS */}
        <div className="space-y-2">
            <div className="text-page-highlight font-bold border-b border-page-dim/20 pb-1 mb-2">SYNTHESIS</div>
            
            <div className="grid grid-cols-[60px_1fr_40px] gap-2 items-center">
                <span>Tone</span>
                <input type="range" min="0" max="1" step="0.01" value={settings.synth.tone} onChange={(e) => handleSynthChange('tone', Number(e.target.value))} />
                <span className="text-right font-mono">{settings.synth.tone.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-[60px_1fr_40px] gap-2 items-center">
                <span>Decay</span>
                <input type="range" min="0" max="1" step="0.01" value={settings.synth.decay} onChange={(e) => handleSynthChange('decay', Number(e.target.value))} />
                <span className="text-right font-mono">{settings.synth.decay.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-[60px_1fr_40px] gap-2 items-center">
                <span>Punch</span>
                <input type="range" min="0" max="1" step="0.01" value={settings.synth.punch} onChange={(e) => handleSynthChange('punch', Number(e.target.value))} />
                <span className="text-right font-mono">{settings.synth.punch.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-[60px_1fr_40px] gap-2 items-center">
                <span>Timbre</span>
                <input type="range" min="0" max="1" step="0.01" value={settings.synth.timbre} onChange={(e) => handleSynthChange('timbre', Number(e.target.value))} />
                <span className="text-right font-mono">{settings.synth.timbre.toFixed(2)}</span>
            </div>
        </div>

        {/* FX PARAMS */}
        <div className="space-y-2">
            <div className="text-page-highlight font-bold border-b border-page-dim/20 pb-1 mb-2">EFFECTS CHAIN</div>
            
            <div className="grid grid-cols-[60px_1fr_40px] gap-2 items-center">
                <span className="text-red-400">Distort</span>
                <input type="range" min="0" max="1" step="0.01" value={settings.effects.distortion} onChange={(e) => handleEffectChange('distortion', Number(e.target.value))} className="accent-red-500" />
                <span className="text-right font-mono text-red-400">{settings.effects.distortion.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-[60px_1fr_40px] gap-2 items-center">
                <span>Filter</span>
                <input type="range" min="100" max="10000" step="100" value={settings.effects.filterFreq} onChange={(e) => handleEffectChange('filterFreq', Number(e.target.value))} />
                <span className="text-right font-mono">{(settings.effects.filterFreq/1000).toFixed(1)}k</span>
            </div>
             <div className="grid grid-cols-[60px_1fr_40px] gap-2 items-center">
                <span>Delay</span>
                <input type="range" min="0" max="0.5" step="0.01" value={settings.effects.delayTime} onChange={(e) => handleEffectChange('delayTime', Number(e.target.value))} />
                <span className="text-right font-mono">{settings.effects.delayTime.toFixed(2)}s</span>
            </div>
             <div className="grid grid-cols-[60px_1fr_40px] gap-2 items-center">
                <span>Volume</span>
                <input type="range" min="0" max="1" step="0.01" value={settings.effects.volume} onChange={(e) => handleEffectChange('volume', Number(e.target.value))} />
                <span className="text-right font-mono">{(settings.effects.volume*100).toFixed(0)}%</span>
            </div>
        </div>

      </div>
    </div>
  );
};