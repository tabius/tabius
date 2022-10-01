// noinspection JSDeprecatedSymbols

/**
 * Array of finger positions.
 * e.g. [-1, 3, 5, 5, -1, -1];
 * 0 is an open string >=1 are the finger positions above the neck.
 */

export type FingerPositions = Array<number|null>;

export function play(fingerPositions: FingerPositions): void {
  const context = new AudioContext();

  // Signal dampening amount.
  let dampening = 0.99;

  // Returns a AudioNode object that will produce a plucking sound.
  function pluck(frequency: number): BiquadFilterNode {
    // Create a script processor that will enable low-level signal sample access.
    const pluck = context.createScriptProcessor(4096, 0, 1);

    // N is the period of our signal in samples
    const N = Math.round(context.sampleRate / frequency);

    // y is the signal presently
    const y = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      // Fill with gaussian noise between [-1, 1].
      y[i] = Math.random() * 2 - 1;
    }

    // This callback produces the sound signal.
    let n = 0;
    pluck.onaudioprocess = (e: AudioProcessingEvent) => {
      // We get a reference to the outputBuffer.
      const output = e.outputBuffer.getChannelData(0);

      // Fill the outputBuffer with the generated signal.
      for (let i = 0; i < e.outputBuffer.length; i++) {
        // This averages the current sample with the next one
        // Effectively, this is a low-pass filter with a
        // frequency exactly half of sampling rate
        y[n] = (y[n] + y[(n + 1) % N]) / 2;

        // Put the actual sample into the buffer
        output[i] = y[n];

        // Hasten the signal decay by applying dampening.
        y[n] *= dampening;

        // Counting constiables to help to read current signal 'y'.
        n++;
        if (n >= N) n = 0;
      }
    };

    // The resulting signal is not as clean as it should be.
    // In lower frequencies, aliasing is producing sharp sounding noise, making the signal sound like a harpsichord.
    // Apply a bandpass centred on our target frequency to remove the unwanted noise.
    const bandpass = context.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = frequency;
    bandpass.Q.value = 1;

    // We connect the ScriptProcessorNode to the BiquadFilterNode
    pluck.connect(bandpass);

    // Our signal would have died down by 2s, so we automatically
    // disconnect eventually to prevent leaking memory.
    setTimeout(() => pluck.disconnect(), 2000);
    setTimeout(() => bandpass.disconnect(), 2000);

    // The bandpass is last AudioNode in the chain, so we return
    // it as the "pluck"
    return bandpass;
  }

  function strum(fingers: FingerPositions, stringCount = 6, stagger = 25): void {
    // Reset dampening to the natural state
    dampening = 0.99;

    // Connect strings to the sink.
    const dst = context.destination;
    for (let index = 0; index < stringCount; index++) {
      if (Number.isFinite(fingers[index])) {
        setTimeout(() => pluck(getFrequency(index, fingers[index])).connect(dst), stagger * index);
      }
    }
  }

  function getFrequency(string, fret): number {
    // Concert A frequency.
    const A = 110;
    // These are how far guitar strings are tuned apart from A.
    const offsets = [-5, 0, 5, 10, 14, 19];
    return A * Math.pow(2, (fret + offsets[string]) / 12);
  }

  // noinspection JSUnusedLocalSymbols
  function mute(): void {
    dampening = 0.89;
  }

  function playChord(frets: FingerPositions): void {
    context.resume().then(() => strum(frets));
  }

  playChord(fingerPositions);
}

