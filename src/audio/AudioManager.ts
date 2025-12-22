/**
 * AudioManager - Handles audio playback with Web Audio API
 * Provides preview playback, volume control, and frequency analysis for visualizations
 */

export interface AudioAnalyzerData {
  // Frequency bands (0-1 normalized)
  bass: number // 20-250 Hz
  mid: number // 250-2000 Hz
  treble: number // 2000-20000 Hz
  // Overall values
  volume: number // Current volume level
  average: number // Average frequency amplitude
}

type AudioEventType = 'play' | 'pause' | 'ended' | 'timeupdate' | 'error'
type AudioEventListener = (data?: unknown) => void

class AudioManager {
  private audioContext: AudioContext | null = null
  private audioElement: HTMLAudioElement | null = null
  private analyzerNode: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null

  private frequencyData: Uint8Array<ArrayBuffer> | null = null
  private currentTrackId: string | null = null
  private targetVolume = 0.5
  private currentVolume = 0
  private isFading = false
  private fadeAnimationId: number | null = null

  private listeners = new Map<AudioEventType, Set<AudioEventListener>>()

  // Fade duration in milliseconds
  private readonly FADE_DURATION = 300

  constructor() {
    // Initialize listener maps
    const events: AudioEventType[] = [
      'play',
      'pause',
      'ended',
      'timeupdate',
      'error',
    ]
    events.forEach((event) => this.listeners.set(event, new Set()))
  }

  /**
   * Initialize the Web Audio API context
   * Must be called after a user interaction due to browser autoplay policies
   */
  initialize(): void {
    if (this.audioContext) return

    this.audioContext = new AudioContext()
    this.analyzerNode = this.audioContext.createAnalyser()
    this.gainNode = this.audioContext.createGain()

    // Configure analyzer for visualization
    this.analyzerNode.fftSize = 256
    this.analyzerNode.smoothingTimeConstant = 0.8
    this.frequencyData = new Uint8Array(this.analyzerNode.frequencyBinCount)

    // Connect gain to analyzer to destination
    this.gainNode.connect(this.analyzerNode)
    this.analyzerNode.connect(this.audioContext.destination)

    // Set initial volume
    this.gainNode.gain.value = this.currentVolume
  }

  /**
   * Play a preview track
   * @param previewUrl - Spotify 30-second preview URL
   * @param trackId - Track ID for tracking current playback
   */
  async play(previewUrl: string, trackId: string): Promise<void> {
    if (!this.audioContext) {
      this.initialize()
    }

    // Resume context if suspended (happens after user interaction)
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }

    // If same track is playing, just resume
    if (this.currentTrackId === trackId && this.audioElement) {
      if (this.audioElement.paused) {
        await this.fadeIn()
        await this.audioElement.play()
      }
      return
    }

    // Stop current playback with fade
    if (this.audioElement && !this.audioElement.paused) {
      await this.fadeOut()
      this.audioElement.pause()
    }

    // Create new audio element
    this.audioElement = new Audio()
    this.audioElement.crossOrigin = 'anonymous'
    this.audioElement.src = previewUrl
    this.currentTrackId = trackId

    // Create new source node and connect
    if (this.sourceNode) {
      this.sourceNode.disconnect()
    }
    if (this.audioContext && this.gainNode) {
      this.sourceNode = this.audioContext.createMediaElementSource(
        this.audioElement
      )
      this.sourceNode.connect(this.gainNode)
    }

    // Set up event listeners
    this.setupEventListeners()

    // Start playback with fade in
    this.currentVolume = 0
    if (this.gainNode) {
      this.gainNode.gain.value = 0
    }
    await this.audioElement.play()
    await this.fadeIn()
  }

  /**
   * Pause current playback
   */
  async pause(): Promise<void> {
    if (!this.audioElement || this.audioElement.paused) return

    await this.fadeOut()
    this.audioElement.pause()
    this.emit('pause')
  }

  /**
   * Stop playback and clean up
   */
  async stop(): Promise<void> {
    if (this.audioElement) {
      if (!this.audioElement.paused) {
        await this.fadeOut()
      }
      this.audioElement.pause()
      this.audioElement.src = ''
    }
    this.currentTrackId = null
    this.emit('ended')
  }

  /**
   * Set volume level
   * @param volume - Volume from 0 to 1
   */
  setVolume(volume: number): void {
    this.targetVolume = Math.max(0, Math.min(1, volume))
    if (!this.isFading && this.gainNode) {
      this.gainNode.gain.value = this.targetVolume
      this.currentVolume = this.targetVolume
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.targetVolume
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false
  }

  /**
   * Get current track ID
   */
  getCurrentTrackId(): string | null {
    return this.currentTrackId
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.audioElement?.currentTime ?? 0
  }

  /**
   * Get track duration
   */
  getDuration(): number {
    return this.audioElement?.duration ?? 0
  }

  /**
   * Seek to position
   * @param time - Time in seconds
   */
  seek(time: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = Math.max(
        0,
        Math.min(time, this.getDuration())
      )
    }
  }

  /**
   * Get analyzer data for visualization
   * Call this in animation loop for reactive visuals
   */
  getAnalyzerData(): AudioAnalyzerData {
    const defaultData: AudioAnalyzerData = {
      bass: 0,
      mid: 0,
      treble: 0,
      volume: 0,
      average: 0,
    }

    if (!this.analyzerNode || !this.frequencyData || !this.isPlaying()) {
      return defaultData
    }

    // Get frequency data
    this.analyzerNode.getByteFrequencyData(this.frequencyData)

    const bufferLength = this.frequencyData.length
    // Split frequencies into bands
    // With fftSize 256, we have 128 bins covering 0-22050 Hz
    const bassEnd = Math.floor(bufferLength * 0.1) // ~20-250 Hz
    const midEnd = Math.floor(bufferLength * 0.4) // ~250-2000 Hz

    // Calculate average for each band
    let bassSum = 0
    let midSum = 0
    let trebleSum = 0
    let totalSum = 0

    for (let i = 0; i < bufferLength; i++) {
      const value = this.frequencyData[i] / 255

      if (i < bassEnd) {
        bassSum += value
      } else if (i < midEnd) {
        midSum += value
      } else {
        trebleSum += value
      }
      totalSum += value
    }

    return {
      bass: bassSum / bassEnd,
      mid: midSum / (midEnd - bassEnd),
      treble: trebleSum / (bufferLength - midEnd),
      volume: this.currentVolume,
      average: totalSum / bufferLength,
    }
  }

  /**
   * Subscribe to audio events
   */
  on(event: AudioEventType, listener: AudioEventListener): () => void {
    const listeners = this.listeners.get(event)
    listeners?.add(listener)

    // Return unsubscribe function
    return () => {
      listeners?.delete(listener)
    }
  }

  /**
   * Emit an event to listeners
   */
  private emit(event: AudioEventType, data?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => {
      listener(data)
    })
  }

  /**
   * Set up audio element event listeners
   */
  private setupEventListeners(): void {
    if (!this.audioElement) return

    this.audioElement.onplay = () => this.emit('play')
    this.audioElement.onpause = () => this.emit('pause')
    this.audioElement.onended = () => {
      this.currentTrackId = null
      this.emit('ended')
    }
    this.audioElement.ontimeupdate = () =>
      this.emit('timeupdate', {
        currentTime: this.getCurrentTime(),
        duration: this.getDuration(),
      })
    this.audioElement.onerror = (e) => this.emit('error', e)
  }

  /**
   * Fade in audio
   */
  private fadeIn(): Promise<void> {
    return this.fade(0, this.targetVolume)
  }

  /**
   * Fade out audio
   */
  private fadeOut(): Promise<void> {
    return this.fade(this.currentVolume, 0)
  }

  /**
   * Smooth volume fade
   */
  private fade(from: number, to: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.fadeAnimationId) {
        cancelAnimationFrame(this.fadeAnimationId)
      }

      this.isFading = true
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / this.FADE_DURATION, 1)

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        this.currentVolume = from + (to - from) * eased

        if (this.gainNode) {
          this.gainNode.gain.value = this.currentVolume
        }

        if (progress < 1) {
          this.fadeAnimationId = requestAnimationFrame(animate)
        } else {
          this.isFading = false
          this.fadeAnimationId = null
          resolve()
        }
      }

      this.fadeAnimationId = requestAnimationFrame(animate)
    })
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.fadeAnimationId) {
      cancelAnimationFrame(this.fadeAnimationId)
    }
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
    }
    if (this.audioContext) {
      this.audioContext.close()
    }

    this.audioElement = null
    this.sourceNode = null
    this.analyzerNode = null
    this.gainNode = null
    this.audioContext = null
    this.currentTrackId = null
  }
}

// Singleton instance
export const audioManager = new AudioManager()

// Export type for use in components
export type { AudioManager }
