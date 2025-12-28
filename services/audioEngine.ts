import { InstrumentType, EffectSettings, SynthParams } from '../types';

class TrackChannel {
  public input: GainNode;
  public distortion: WaveShaperNode;
  public filter: BiquadFilterNode;
  public delay: DelayNode;
  public delayFeedback: GainNode;
  public reverb: ConvolverNode;
  public dryGain: GainNode;
  public wetGain: GainNode; 
  public volume: GainNode;
  
  constructor(ctx: AudioContext, master: GainNode, impulseBuffer: AudioBuffer | null) {
    this.input = ctx.createGain();
    
    // Distortion
    this.distortion = ctx.createWaveShaper();
    this.distortion.curve = new Float32Array([0, 0]);
    this.distortion.oversample = '4x';

    // Filter
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;
    
    // Delay
    this.delay = ctx.createDelay();
    this.delayFeedback = ctx.createGain();
    this.delay.delayTime.value = 0;
    this.delayFeedback.gain.value = 0;
    
    // Reverb
    this.reverb = ctx.createConvolver();
    if (impulseBuffer) this.reverb.buffer = impulseBuffer;
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0;
    this.dryGain.gain.value = 1;

    // Output Volume
    this.volume = ctx.createGain();
    this.volume.gain.value = 0.8;

    this.input.connect(this.distortion);
    this.distortion.connect(this.filter);
    this.filter.connect(this.delay);
    this.filter.connect(this.dryGain);
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(this.dryGain);
    this.dryGain.connect(this.reverb);
    this.dryGain.connect(this.volume);
    this.reverb.connect(this.wetGain);
    this.wetGain.connect(this.volume);
    this.volume.connect(master);
  }

  updateSettings(settings: EffectSettings) {
    this.distortion.curve = this.makeDistortionCurve(settings.distortion * 400);
    this.filter.frequency.setValueAtTime(settings.filterFreq, 0);
    this.filter.Q.setValueAtTime(settings.filterRes, 0);
    if(settings.filterFreq < 1000) this.filter.type = 'lowpass';
    else if(settings.filterFreq > 15000) this.filter.type = 'allpass';
    else this.filter.type = 'lowpass';
    this.delay.delayTime.setValueAtTime(settings.delayTime, 0);
    this.delayFeedback.gain.setValueAtTime(settings.delayFeedback, 0);
    this.wetGain.gain.setValueAtTime(settings.reverbMix, 0);
    this.volume.gain.setValueAtTime(settings.volume, 0);
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    if (amount === 0) {
        for (let i = 0; i < n_samples; ++i) curve[i] = (i / (n_samples - 1)) * 2 - 1;
        return curve;
    }
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tracks: Map<InstrumentType, TrackChannel> = new Map();
  private impulseBuffer: AudioBuffer | null = null;

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.ratio.value = 12;
      this.masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.impulseBuffer = this.createImpulseResponse(this.ctx);
      Object.values(InstrumentType).forEach(type => {
        if (this.ctx && this.masterGain) {
            this.tracks.set(type as InstrumentType, new TrackChannel(this.ctx, this.masterGain, this.impulseBuffer));
        }
      });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private createImpulseResponse(ctx: AudioContext): AudioBuffer {
    const duration = 2.0;
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 4);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    return impulse;
  }

  public updateTrackSettings(type: InstrumentType, settings: EffectSettings) {
    if (!this.ctx) return;
    const track = this.tracks.get(type);
    if (track) track.updateSettings(settings);
  }

  public playSound(type: InstrumentType, params: SynthParams, frequency?: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const track = this.tracks.get(type);
    if (!track) return;
    const dest = track.input;

    switch (type) {
      case InstrumentType.KICK: this.synthKick(t, dest, params); break;
      case InstrumentType.SNARE: this.synthSnare(t, dest, params); break;
      case InstrumentType.HIHAT: this.synthHiHat(t, dest, params); break;
      case InstrumentType.CLAP: this.synthClap(t, dest, params); break;
      case InstrumentType.BASS: this.synthBass(t, dest, params, frequency); break;
      case InstrumentType.LEAD: this.synthLead(t, dest, params, frequency); break;
    }
  }

  private synthKick(t: number, dest: AudioNode, p: SynthParams) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = p.timbre > 0.5 ? 'square' : 'sine';
    osc.connect(gain);
    gain.connect(dest);
    const baseFreq = 40 + (p.tone * 110);
    const freqDrop = 50 + (p.punch * 200);
    osc.frequency.setValueAtTime(baseFreq + freqDrop, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.05 + (p.decay * 0.1));
    const len = 0.2 + (p.decay * 0.8);
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + len);
    osc.start(t);
    osc.stop(t + len);
  }

  private synthSnare(t: number, dest: AudioNode, p: SynthParams) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.type = 'triangle';
    const freq = 150 + (p.tone * 250);
    osc.frequency.setValueAtTime(freq, t);
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1 + (p.decay * 0.1));
    osc.start(t);
    osc.stop(t + 0.2);
    const noiseDur = 0.1 + (p.decay * 0.4);
    const filterFreq = 1000 + (p.timbre * 6000);
    const noiseVol = 0.5 + (p.punch * 0.5);
    this.playNoise(t, noiseDur, 'bandpass', filterFreq, dest, noiseVol);
  }

  private synthHiHat(t: number, dest: AudioNode, p: SynthParams) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 400 + (p.timbre * 600);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000 + (p.tone * 7000);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    const len = 0.05 + (p.decay * 0.4);
    gain.gain.setValueAtTime(0.6 * p.punch, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + len);
    osc.start(t);
    osc.stop(t + len);
  }

  private synthClap(t: number, dest: AudioNode, p: SynthParams) {
    if (!this.ctx) return;
    const dur = 0.1 + (p.decay * 0.4);
    const filterFreq = 800 + (p.tone * 3000);
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1 + (p.timbre * 5); 
    const gain = this.ctx.createGain();
    const startTime = t;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.03); 
    gain.gain.linearRampToValueAtTime(0.8, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.06); 
    gain.gain.linearRampToValueAtTime(1, startTime + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur); 
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(t);
    noise.stop(t + dur);
  }

  private synthBass(t: number, dest: AudioNode, p: SynthParams, frequency?: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = p.timbre > 0.5 ? 'sawtooth' : 'square';
    const freq = frequency || (30 + (p.tone * 80)); 
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.1 + (p.punch * 0.2));
    filter.Q.value = p.punch * 10;
    const dur = 0.1 + (p.decay * 1.4);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  }

  private synthLead(t: number, dest: AudioNode, p: SynthParams, frequency?: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = p.timbre > 0.6 ? 'sawtooth' : (p.timbre > 0.3 ? 'square' : 'triangle');
    const freq = frequency || (200 + (p.tone * 600));
    osc.frequency.setValueAtTime(freq, t);
    if (p.punch > 0.3) {
       const vibOsc = this.ctx.createOscillator();
       const vibGain = this.ctx.createGain();
       vibOsc.frequency.value = 5 + (p.punch * 10); 
       vibGain.gain.value = 5 + (p.punch * 20); 
       vibOsc.connect(vibGain);
       vibGain.connect(osc.frequency);
       vibOsc.start(t);
       vibOsc.stop(t + 2);
    }
    const dur = 0.1 + (p.decay * 1.9);
    osc.connect(gain);
    gain.connect(dest);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.linearRampToValueAtTime(0.4, t + dur * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  }

  private playNoise(t: number, duration: number, filterType: BiquadFilterType, freq: number, dest: AudioNode, vol: number = 1) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(t);
    noise.stop(t + duration);
  }
}

export const audioEngine = new AudioEngine();