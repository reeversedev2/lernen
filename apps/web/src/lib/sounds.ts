export async function playCorrect() {
  try {
    const audio = new Audio('/sounds/ipl.mp3')
    audio.volume = 0.8
    await audio.play()
    return
  } catch {
    // Fall back to a quick synthesised crowd cheer if file not found
  }

  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime

    // IPL trumpet fanfare — daa-daa-da-da-daa-daaa
    // Notes as [frequency, startOffset, duration]
    const notes: [number, number, number][] = [
      [523, 0.0, 0.18], // C5  — daa
      [659, 0.2, 0.18], // E5  — daa
      [523, 0.4, 0.1], // C5  — da
      [659, 0.52, 0.1], // E5  — da
      [784, 0.64, 0.22], // G5  — daa
      [1047, 0.88, 0.36], // C6  — daaa (big finish)
    ]

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.55
    masterGain.connect(ctx.destination)

    for (const [freq, offset, dur] of notes) {
      // Brass-like tone: sawtooth + slight detune + quick attack/release
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq

      // Slight detune for warmth
      const osc2 = ctx.createOscillator()
      osc2.type = 'sawtooth'
      osc2.frequency.value = freq * 1.005

      const env = ctx.createGain()
      env.gain.setValueAtTime(0, now + offset)
      env.gain.linearRampToValueAtTime(0.5, now + offset + 0.02) // fast attack
      env.gain.setValueAtTime(0.5, now + offset + dur - 0.04)
      env.gain.linearRampToValueAtTime(0, now + offset + dur) // release

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 2400

      osc.connect(filter)
      osc2.connect(filter)
      filter.connect(env)
      env.connect(masterGain)

      osc.start(now + offset)
      osc.stop(now + offset + dur)
      osc2.start(now + offset)
      osc2.stop(now + offset + dur)
    }

    const totalDur = 0.88 + 0.36
    setTimeout(() => ctx.close(), (totalDur + 0.2) * 1000)
  } catch {
    // Audio not supported
  }
}

export async function playMoo() {
  try {
    // Try a real moo file first — drop moo.mp3 in /public/sounds/ to use it
    const audio = new Audio('/sounds/moo.mp3')
    audio.volume = 0.7
    await audio.play()
    return
  } catch {
    // Fall back to synthesised version
  }

  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const dur = 1.5

    // LFO — slow vibrato kicks in after the attack
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = 'sine'
    lfo.frequency.value = 4.5
    lfoGain.gain.setValueAtTime(0, now)
    lfoGain.gain.linearRampToValueAtTime(10, now + 0.25)
    lfo.connect(lfoGain)

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0, now)
    masterGain.gain.linearRampToValueAtTime(0.7, now + 0.06) // quick attack
    masterGain.gain.setValueAtTime(0.7, now + dur * 0.55)
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + dur)
    masterGain.connect(ctx.destination)

    // Pitch envelope: short upward scoop then a long glide down (real cow shape)
    const baseFreq = (t: number): number => {
      if (t < 0.05) return 160 + t * 800 // brief upward scoop
      if (t < 0.2) return 200 - (t - 0.05) * 400 // fall back
      return 140 - (t - 0.2) * 35 // slow glide down
    }

    const addOsc = (type: OscillatorType, harmonicMult: number, gainVal: number) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      g.gain.value = gainVal

      // Schedule pitch envelope in steps
      const steps = 20
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * dur
        const f = baseFreq(t) * harmonicMult
        if (i === 0) osc.frequency.setValueAtTime(f, now + t)
        else osc.frequency.linearRampToValueAtTime(f, now + t)
      }

      lfoGain.connect(osc.frequency)
      osc.connect(g)
      g.connect(masterGain)
      osc.start(now)
      osc.stop(now + dur)
    }

    lfo.start(now)
    lfo.stop(now + dur)

    addOsc('sine', 1, 0.55) // fundamental
    addOsc('sine', 2, 0.2) // 2nd harmonic
    addOsc('triangle', 3, 0.08) // 3rd harmonic — adds warmth
    addOsc('sine', 0.5, 0.06) // sub — adds body

    setTimeout(() => ctx.close(), (dur + 0.3) * 1000)
  } catch {
    // Audio not supported
  }
}
