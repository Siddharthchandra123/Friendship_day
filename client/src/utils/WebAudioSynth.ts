class WebAudioSynth {
  private ctx: AudioContext | null = null;
  private primaryGain: GainNode | null = null;
  private delayGain: GainNode | null = null;
  private oscs: OscillatorNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private isPlaying = false;
  private timeoutId: any = null;

  // Chord Progression (MIDI Notes for soft ambient chords)
  // Cmaj9 -> Am9 -> Fmaj9 -> G6/9
  private chords = [
    [48, 60, 64, 67, 71, 74], // Cmaj9: C3, C4, E4, G4, B4, D5
    [45, 57, 60, 64, 67, 71], // Am9: A2, A3, C4, E4, G4, B4
    [41, 53, 57, 60, 64, 67], // Fmaj9: F2, F3, A3, C4, E4, G4
    [43, 55, 59, 62, 64, 69]  // G6/9: G2, G3, B3, D4, E4, A4
  ];
  private currentChordIndex = 0;

  constructor() {}

  private midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  public start() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master Gain
    this.primaryGain = this.ctx.createGain();
    this.primaryGain.gain.setValueAtTime(0, this.ctx.currentTime);
    // Smooth fade in
    this.primaryGain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 3);

    // Biquad Filter (Lowpass)
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    // LFO for filter sweep (creates slow movement)
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // very slow sweep: 12 seconds per cycle
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(150, this.ctx.currentTime); // Sweep between 250Hz and 550Hz
    
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.filter.frequency);
    this.lfo.start();

    // Delay Line (Warm feedback delay)
    const delay = this.ctx.createDelay(2.0);
    delay.delayTime.setValueAtTime(0.6, this.ctx.currentTime); // 600ms delay
    
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.4, this.ctx.currentTime); // feedback amount
    
    // Connect filter output to master gain and delay line
    this.filter.connect(this.primaryGain);
    
    // Delay loop
    this.filter.connect(delay);
    delay.connect(this.delayGain);
    this.delayGain.connect(delay); // feedback loop
    this.delayGain.connect(this.primaryGain); // send delay output to master

    this.primaryGain.connect(this.ctx.destination);

    // Start playing chords loop
    this.playNextChord();
  }

  private playNextChord() {
    if (!this.isPlaying || !this.ctx || !this.filter) return;

    const chord = this.chords[this.currentChordIndex];
    const now = this.ctx.currentTime;
    const duration = 8.0; // 8 seconds per chord
    const fadeTime = 2.5; // slow attack and release

    // Clean up old oscillators
    const oldOscs = [...this.oscs];
    this.oscs = [];

    // Fade out previous oscillators
    oldOscs.forEach(osc => {
      try {
        osc.stop(now + fadeTime);
      } catch (e) {
        // Already stopped
      }
    });

    // Spawn new oscillators for the new chord
    chord.forEach((note, index) => {
      if (!this.ctx || !this.filter) return;

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      // Use warm triangle waves for ambient chords
      osc.type = index % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(this.midiToFreq(note), now);

      // Low volume per oscillator to prevent clipping
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.04, now + fadeTime); // Fade in
      oscGain.gain.setValueAtTime(0.04, now + duration - fadeTime);
      oscGain.gain.linearRampToValueAtTime(0, now + duration); // Fade out

      osc.connect(oscGain);
      oscGain.connect(this.filter);
      
      osc.start(now);
      this.oscs.push(osc);
    });

    // Advance chord progression
    this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;

    // Schedule next chord change
    this.timeoutId = setTimeout(() => {
      this.playNextChord();
    }, (duration - fadeTime) * 1000);
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const fadeOutDuration = 2.0;
    const now = this.ctx ? this.ctx.currentTime : 0;

    if (this.primaryGain && this.ctx) {
      this.primaryGain.gain.setValueAtTime(this.primaryGain.gain.value, now);
      this.primaryGain.gain.linearRampToValueAtTime(0, now + fadeOutDuration);
    }

    setTimeout(() => {
      // Clean up everything
      this.oscs.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {}
      });
      this.oscs = [];

      if (this.lfo) {
        try {
          this.lfo.stop();
        } catch (e) {}
        this.lfo = null;
      }

      if (this.ctx) {
        this.ctx.close();
        this.ctx = null;
      }

      this.primaryGain = null;
      this.delayGain = null;
      this.filter = null;
    }, fadeOutDuration * 1000 + 100);
  }
}

export const ambientSynth = new WebAudioSynth();
