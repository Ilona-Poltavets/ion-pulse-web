let context: AudioContext | undefined

/** A short synthesised paper "swish": no audio file is needed. */
export function playFlipSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    context ??= new AudioContextClass()
    if (context.state === 'suspended') void context.resume()

    const duration = 0.22
    const frames = Math.floor(context.sampleRate * duration)
    const buffer = context.createBuffer(1, frames, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < frames; index += 1) {
      const fade = Math.sin((Math.PI * index) / frames)
      data[index] = (Math.random() * 2 - 1) * fade
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1400, context.currentTime)
    filter.frequency.linearRampToValueAtTime(4200, context.currentTime + duration)
    filter.Q.value = 0.7
    const gain = context.createGain()
    gain.gain.value = 0.12
    source.connect(filter).connect(gain).connect(context.destination)
    source.start()
  } catch {
    // Sound is a nicety; ignore autoplay or device errors.
  }
}
