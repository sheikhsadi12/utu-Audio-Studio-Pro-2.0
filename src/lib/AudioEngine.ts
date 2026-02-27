import { GoogleGenAI, Modality } from "@google/genai";
import { useSettingsStore } from '../store/useSettingsStore';
import { storageService } from './StorageService';

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private chunkQueue: AudioBuffer[] = [];
  private accumulatedBytes: Uint8Array[] = [];
  private nextStartTime: number = 0;
  private isStreamFinished: boolean = false;
  private isBuffering: boolean = false;
  private isPlaying: boolean = false;
  private totalDurationScheduled: number = 0;
  private schedulerInterval: number | null = null;
  private abortController: AbortController | null = null;

  // For seekable, loaded audio
  private currentSource: AudioBufferSourceNode | null = null;
  private fullLoadedBuffer: AudioBuffer | null = null;
  private playbackStartTime: number = 0;
  private pausedTime: number = 0;
  private progressUpdateId: number | null = null;

  // Pre-roll threshold in seconds
  private readonly BUFFER_THRESHOLD = 5;
  // Micro-fade time in seconds
  private readonly FADE_TIME = 0.005;

  constructor() {}

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(console.error);
    }
  }

  async generateAudio(text: string, styleInstruction: string): Promise<void> {
    const { apiKey, selectedVoice, voicePitch, clonedVoiceData, setIsGenerating, setIsPlaying, setIsBuffering, setProgress } = useSettingsStore.getState();

    if (!apiKey) throw new Error("Neural Link Failed: Missing API Key");

    // Stop current playback but keep context
    this.resetPlaybackState();
    this.initAudioContext();
    
    setIsGenerating(true);
    setIsBuffering(true);
    this.isBuffering = true;
    this.isPlaying = true;
    setIsPlaying(true);
    this.isStreamFinished = false;
    this.chunkQueue = [];
    this.accumulatedBytes = [];
    this.nextStartTime = this.audioContext!.currentTime + 0.1;
    this.totalDurationScheduled = 0;
    this.abortController = new AbortController();
    this.fullLoadedBuffer = null;
    this.pausedTime = 0;
    this.playbackStartTime = 0;

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // 1. Pre-process text: Insert breathers every 50 words
      const words = text.split(/\s+/);
      let processedText = "";
      for (let i = 0; i < words.length; i++) {
        processedText += words[i] + " ";
        if ((i + 1) % 50 === 0 && i !== words.length - 1) {
          processedText += ".  "; // Breath force
        }
      }

      // 2. Split into chunks (~75 words per chunk for ~30s)
      const chunkSize = 75;
      const textChunks: string[] = [];
      const processedWords = processedText.trim().split(/\s+/);
      for (let i = 0; i < processedWords.length; i += chunkSize) {
        textChunks.push(processedWords.slice(i, i + chunkSize).join(" "));
      }

      const audioBuffers: (AudioBuffer | null)[] = new Array(textChunks.length).fill(null);
      const systemInstruction = "You are a professional voice artist. Speak with a steady, slow, and consistent pace (0.9x speed). Maintain a calm tone. Do NOT speed up at the end of the script.";

      // Process chunks with a concurrency limit to speed up generation without hitting rate limits too hard
      const concurrencyLimit = 3;
      let currentIndex = 0;

      const processNextChunk = async (): Promise<void> => {
        while (currentIndex < textChunks.length) {
          if (this.abortController.signal.aborted) break;
          
          const i = currentIndex++;
          const chunk = textChunks[i];
          const pitchValue = voicePitch === 0 ? "default" : `${voicePitch > 0 ? '+' : ''}${voicePitch * 2}st`;
          
          const response = await this.retry(async () => {
            if (clonedVoiceData) {
              // Voice Cloning Mode
              const audioPart = {
                inlineData: {
                  mimeType: "audio/mp3",
                  data: clonedVoiceData.split(',')[1] || clonedVoiceData,
                },
              };
              const textPart = {
                text: `${systemInstruction}\n\nStyle: ${styleInstruction || 'Natural and clear'}. Text: "${chunk}"`,
              };
              
              return await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ parts: [audioPart, textPart] }],
                config: {
                  responseModalities: [Modality.AUDIO],
                },
              });
            } else {
              // Standard TTS Mode
              const prompt = `<speak><prosody rate="90%" pitch="${pitchValue}">${systemInstruction} Text: "${chunk}"</prosody></speak>`;
              
              return await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: selectedVoice },
                    },
                  },
                },
              });
            }
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            const bytes = this.base64ToUint8(base64Audio);
            const buffer = await this.decodeBytes(bytes);
            if (buffer) {
              audioBuffers[i] = buffer;
            }
          }
        }
      };

      const workers = [];
      for (let i = 0; i < Math.min(concurrencyLimit, textChunks.length); i++) {
        workers.push(processNextChunk());
      }
      await Promise.all(workers);

      this.isStreamFinished = true;
      const validBuffers = audioBuffers.filter((b): b is AudioBuffer => b !== null);

      if (validBuffers.length > 0) {
        // Merge AudioBuffers
        const sampleRate = 24000;
        const totalSamples = validBuffers.reduce((acc, b) => acc + b.length, 0);
        const mergedBuffer = this.audioContext!.createBuffer(1, totalSamples, sampleRate);
        const channelData = mergedBuffer.getChannelData(0);
        
        let offset = 0;
        for (const b of validBuffers) {
            const data = b.getChannelData(0);
            this.applyMicroFade(b);
            channelData.set(data, offset);
            offset += b.length;
        }

        const finalBlob = this.bufferToMp3(mergedBuffer);
        
        if (finalBlob) {
          await storageService.saveAudio({
            id: crypto.randomUUID(),
            title: `Recording ${new Date().toLocaleTimeString()}`,
            voice: selectedVoice,
            style: styleInstruction || 'Custom',
            duration: mergedBuffer.duration,
            timestamp: Date.now(),
            blob: finalBlob,
          });
          window.dispatchEvent(new CustomEvent('library-updated'));
          
          // Load and play the complete audio file
          await this.loadBlob(finalBlob);
        }
      }

    } catch (error) {
      console.error("[AudioEngine] Generation failed:", error);
      this.stop();
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }

  private async retry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  private base64ToUint8(base64: string): Uint8Array {
    const binaryString = window.atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeBytes(bytes: Uint8Array): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;
    try {
      // Use a slice of the buffer to ensure we only decode the relevant part
      return await this.audioContext.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    } catch (e) {
      // Fallback to raw PCM 16-bit 24kHz Mono
      // Ensure even length for Int16Array (2 bytes per sample)
      const evenLength = bytes.length - (bytes.length % 2);
      if (evenLength < 2) return null;
      
      const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, evenLength / 2);
      const buffer = this.audioContext.createBuffer(1, pcm16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }
      return buffer;
    }
  }

  private applyMicroFade(buffer: AudioBuffer) {
    const sampleRate = buffer.sampleRate;
    const fadeSamples = Math.floor(this.FADE_TIME * sampleRate);

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      if (data.length < fadeSamples * 2) continue;
      for (let i = 0; i < fadeSamples; i++) {
        data[i] *= (i / fadeSamples);
        data[data.length - 1 - i] *= (i / fadeSamples);
      }
    }
  }

  private startScheduler() {
    if (this.schedulerInterval) return;
    this.schedulerInterval = window.setInterval(() => this.scheduleNextChunks(), 100);
  }

  private scheduleNextChunks() {
    if (!this.audioContext || !this.isPlaying || this.isBuffering) return;

    const lookAhead = 0.3;
    const now = this.audioContext.currentTime;

    while (this.chunkQueue.length > 0 && this.nextStartTime < now + lookAhead) {
      // Anti-Speed-up: If we fell behind, reset nextStartTime to now to prevent burst playback
      if (this.nextStartTime < now) {
        this.nextStartTime = now;
      }
      
      const chunk = this.chunkQueue.shift()!;
      this.playChunk(chunk, this.nextStartTime);
      this.nextStartTime += chunk.duration;
      this.totalDurationScheduled += chunk.duration;
    }

    if (this.chunkQueue.length === 0 && !this.isStreamFinished && this.nextStartTime < now + 0.1) {
      this.startBuffering();
    }

    if (this.isStreamFinished && this.chunkQueue.length === 0 && now > this.nextStartTime) {
      this.stop();
    }

    const played = Math.max(0, now - (this.nextStartTime - this.totalDurationScheduled));
    useSettingsStore.getState().setProgress(played);
  }

  private playChunk(buffer: AudioBuffer, time: number) {
    if (!this.audioContext || !this.gainNode) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1.0;
    source.connect(this.gainNode);
    source.start(time);
  }

  private startBuffering() {
    if (this.isBuffering) return;
    this.isBuffering = true;
    useSettingsStore.getState().setIsBuffering(true);
  }

  private stopBuffering() {
    this.isBuffering = false;
    useSettingsStore.getState().setIsBuffering(false);
    if (this.audioContext) {
      this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime + 0.1);
    }
  }

  play() {
    this.initAudioContext();
    
    if (this.fullLoadedBuffer) { // Logic for loaded file
        this.playLoadedBuffer(this.pausedTime);
    } else if (this.isPlaying === false && this.isStreamFinished === false) { // Original logic for streaming resume
        this.isPlaying = true;
        useSettingsStore.getState().setIsPlaying(true);
        this.startScheduler();
    }
  }

  pause() {
    this.isPlaying = false;
    useSettingsStore.getState().setIsPlaying(false);
    
    if (this.fullLoadedBuffer && this.audioContext) {
        this.pausedTime = this.audioContext.currentTime - this.playbackStartTime;
    }
    
    if (this.currentSource) {
        try { this.currentSource.onended = null; this.currentSource.stop(); } catch(e) {}
        this.currentSource = null;
    }

    this.stopProgressUpdater();
    
    if (this.schedulerInterval) {
        window.clearInterval(this.schedulerInterval);
        this.schedulerInterval = null;
    }
  }

  private resetPlaybackState() {
    this.isPlaying = false;
    this.isBuffering = false;
    this.abortController?.abort();
    this.stopProgressUpdater();

    if (this.currentSource) {
      this.currentSource.onended = null;
      try { this.currentSource.stop(); } catch(e) {}
      this.currentSource = null;
    }
    
    if (this.schedulerInterval) {
      window.clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    const state = useSettingsStore.getState();
    state.setIsPlaying(false);
    state.setIsBuffering(false);
    state.setIsGenerating(false);
  }

  stop() {
    this.resetPlaybackState();
    this.isStreamFinished = true;
    this.chunkQueue = [];
    this.totalDurationScheduled = 0;
    this.fullLoadedBuffer = null;
    this.pausedTime = 0;
    this.playbackStartTime = 0;
    this.accumulatedBytes = [];
    
    useSettingsStore.getState().setProgress(0);
  }

  setSpeed(speed: number) {
    console.warn("Playback speed locked to 1.0 for Neural Integrity");
  }

  getAudioBuffer(): AudioBuffer | null {
    return null; 
  }

  async loadBlob(blob: Blob): Promise<void> {
    this.resetPlaybackState();
    this.initAudioContext();
    useSettingsStore.getState().setIsBuffering(true);
    const arrayBuffer = await blob.arrayBuffer();
    try {
      const buffer = await this.audioContext!.decodeAudioData(arrayBuffer.slice(0));
      this.fullLoadedBuffer = buffer;
      this.isStreamFinished = true;
      this.pausedTime = 0;
      this.playbackStartTime = 0;
      
      // Immediately update the total duration for the UI
      const { playlist, currentIndex } = useSettingsStore.getState();
      if (playlist[currentIndex]) {
        playlist[currentIndex].duration = buffer.duration;
        useSettingsStore.getState().setPlaylist([...playlist]);
      }
      this.stopBuffering();
      this.playLoadedBuffer(0);
    } catch (error) {
      console.error("Failed to decode audio blob", error);
      this.stop();
    }
  }

  async trimAudio(blob: Blob, startTime: number, endTime: number): Promise<Blob | null> {
    this.initAudioContext();
    if (!this.audioContext) return null;

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const originalBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      if (startTime < 0) startTime = 0;
      if (endTime > originalBuffer.duration) endTime = originalBuffer.duration;
      if (startTime >= endTime) throw new Error("Invalid trim times");

      const sampleRate = originalBuffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const frameCount = endSample - startSample;

      const newBuffer = this.audioContext.createBuffer(
        originalBuffer.numberOfChannels,
        frameCount,
        sampleRate
      );

      for (let i = 0; i < originalBuffer.numberOfChannels; i++) {
        const channelData = originalBuffer.getChannelData(i);
        const newChannelData = newBuffer.getChannelData(i);
        for (let j = 0; j < frameCount; j++) {
            newChannelData[j] = channelData[startSample + j];
        }
      }
      
      this.applyMicroFade(newBuffer);
      return this.bufferToMp3(newBuffer);

    } catch (e) {
      console.error("Trim failed", e);
      return null;
    }
  }

  async mergeAudios(blobs: Blob[], transition: 'gap' | 'crossfade' = 'gap', transitionDuration: number = 0.5): Promise<Blob | null> {
    this.initAudioContext();
    if (!this.audioContext) return null;

    const buffers: AudioBuffer[] = [];
    for (const blob of blobs) {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
        buffers.push(buffer);
      } catch (e) {
        console.error("Error decoding blob for merge:", e);
      }
    }

    if (buffers.length === 0) return null;

    const sampleRate = 24000;
    let totalSamples = 0;
    
    if (transition === 'crossfade') {
        const overlapSamples = Math.floor(transitionDuration * sampleRate);
        totalSamples = buffers.reduce((acc, b) => acc + b.length, 0) - (buffers.length - 1) * overlapSamples;
    } else {
        const gapSamples = Math.floor(transitionDuration * sampleRate);
        totalSamples = buffers.reduce((acc, b) => acc + b.length, 0) + (buffers.length - 1) * gapSamples;
    }

    const mergedBuffer = this.audioContext.createBuffer(1, totalSamples, sampleRate);
    const channelData = mergedBuffer.getChannelData(0);

    let offset = 0;
    
    if (transition === 'crossfade') {
        const overlapSamples = Math.floor(transitionDuration * sampleRate);
        
        for (let i = 0; i < buffers.length; i++) {
            const b = buffers[i];
            const data = b.getChannelData(0);
            
            // Apply fades for crossfade
            if (i > 0) {
                // Fade in start
                for (let j = 0; j < overlapSamples && j < data.length; j++) {
                    data[j] *= (j / overlapSamples);
                }
            }
            if (i < buffers.length - 1) {
                // Fade out end
                for (let j = 0; j < overlapSamples && j < data.length; j++) {
                    data[data.length - 1 - j] *= (j / overlapSamples);
                }
            }
            
            // Add to merged buffer
            for (let j = 0; j < data.length; j++) {
                 if (offset + j < totalSamples) {
                     channelData[offset + j] += data[j];
                 }
            }
            
            offset += b.length - overlapSamples;
        }
    } else {
        const gapSamples = Math.floor(transitionDuration * sampleRate);
        for (let i = 0; i < buffers.length; i++) {
            const b = buffers[i];
            const data = b.getChannelData(0);
            this.applyMicroFade(b);
            channelData.set(data, offset);
            offset += b.length;
            if (i < buffers.length - 1) offset += gapSamples;
        }
    }

    return this.bufferToMp3(mergedBuffer);
  }

  private bufferToMp3(buffer: AudioBuffer): Blob {
    const samples = buffer.getChannelData(0);
    const int16Samples = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      // PCM Normalization to Int16
      const s = Math.max(-1, Math.min(1, samples[i]));
      int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const mp3encoder = new (window as any).lamejs.Mp3Encoder(1, 24000, 128);
    const mp3Data: Int8Array[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
      const sampleChunk = int16Samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    return new Blob(mp3Data, { type: "audio/mp3" });
  }

  exportMp3(): Blob | null {
    if (this.accumulatedBytes.length === 0) return null;
    
    const totalLength = this.accumulatedBytes.reduce((acc, b) => acc + b.length, 0);
    // Ensure even length for 16-bit PCM data
    const evenTotalLength = totalLength - (totalLength % 2);
    const joined = new Uint8Array(evenTotalLength);
    
    let offset = 0;
    for (const b of this.accumulatedBytes) {
      const remaining = evenTotalLength - offset;
      if (remaining <= 0) break;
      const toCopy = Math.min(b.length, remaining);
      joined.set(b.subarray(0, toCopy), offset);
      offset += toCopy;
    }
    
    // Check if the data already has a WAV header (starts with 'RIFF')
    // If it does, we need to strip it before passing to MP3 encoder
    let pcmData = joined;
    if (joined.length >= 44 && joined[0] === 0x52 && joined[1] === 0x49 && joined[2] === 0x46 && joined[3] === 0x46) {
      // Assuming standard 44-byte WAV header
      pcmData = joined.subarray(44);
    }
    
    // Convert to Int16Array for lamejs
    const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
    
    // Initialize MP3 Encoder (Mono, 24kHz, 128kbps)
    const mp3encoder = new (window as any).lamejs.Mp3Encoder(1, 24000, 128);
    const mp3Data: Int8Array[] = [];
    
    const sampleBlockSize = 1152; // Multiple of 576
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    return new Blob(mp3Data, { type: "audio/mp3" });
  }

  private createWavHeader(dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number): ArrayBuffer {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    return header;
  }

  seek(time: number) {
    if (this.fullLoadedBuffer) {
      this.pausedTime = time;
      if (this.isPlaying) {
        this.playLoadedBuffer(time);
      }
      // Also update progress immediately for responsiveness
      useSettingsStore.getState().setProgress(time);
    }
  }

  private playLoadedBuffer(startTime: number = 0) {
    if (!this.audioContext || !this.fullLoadedBuffer) return;

    if (this.currentSource) {
      this.currentSource.onended = null;
      try { this.currentSource.stop(); } catch(e) {}
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.fullLoadedBuffer;
    source.connect(this.gainNode!);
    
    // Ensure startTime is within bounds
    const actualStartTime = Math.max(0, Math.min(startTime, this.fullLoadedBuffer.duration));
    
    source.start(0, actualStartTime);
    
    source.onended = () => {
      if (this.isPlaying && this.audioContext && this.fullLoadedBuffer) {
        const elapsed = this.audioContext.currentTime - this.playbackStartTime;
        if (elapsed >= this.fullLoadedBuffer.duration - 0.1) {
          this.stop();
        }
      }
    };

    this.currentSource = source;
    this.playbackStartTime = this.audioContext.currentTime - actualStartTime;
    this.isPlaying = true;
    useSettingsStore.getState().setIsPlaying(true);

    this.startProgressUpdater();
  }

  private startProgressUpdater() {
    this.stopProgressUpdater();
    const update = () => {
      if (!this.isPlaying || !this.audioContext || !this.fullLoadedBuffer) {
        this.stopProgressUpdater();
        return;
      }
      const elapsed = this.audioContext.currentTime - this.playbackStartTime;
      if (elapsed < this.fullLoadedBuffer.duration) {
        useSettingsStore.getState().setProgress(elapsed);
        this.progressUpdateId = requestAnimationFrame(update);
      } else {
        useSettingsStore.getState().setProgress(this.fullLoadedBuffer.duration);
        this.stop();
      }
    };
    this.progressUpdateId = requestAnimationFrame(update);
  }

  private stopProgressUpdater() {
    if (this.progressUpdateId) {
      cancelAnimationFrame(this.progressUpdateId);
      this.progressUpdateId = null;
    }
  }

  getFrequencyData(array: Uint8Array) {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array);
    }
  }

  getAnalyser() {
    return this.analyserNode;
  }
}

export const audioEngine = new AudioEngine();
