/* ==========================================================================
   VocaFlow - Text To Speech (TTS) Synthesizer
   ========================================================================== */

import { stateManager } from './state.js';

class TTSEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.isSupported = !!this.synth;

    if (this.isSupported) {
      // Chrome/Safari load voices asynchronously
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
      this.loadVoices();
    }
  }

  loadVoices() {
    if (!this.isSupported) return;
    this.voices = this.synth.getVoices();
  }

  /**
   * Speak a word.
   * Cancel any pending speech before playing new audio.
   * @param {string} text
   */
  speak(text) {
    if (!this.isSupported) {
      console.warn('Speech synthesis is not supported on this browser.');
      this.dispatchTtsError();
      return;
    }

    try {
      // Stop current speaking
      this.synth.cancel();

      if (!text || text.trim() === '') return;

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Load current settings from StateManager
      utterance.rate = stateManager.getTtsRate();
      utterance.pitch = stateManager.getTtsPitch();

      // Find an English voice (e.g. en-US, en-GB, en-AU)
      const englishVoice = this.voices.find(voice => 
        voice.lang.startsWith('en-') || voice.lang.startsWith('en_')
      );

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onerror = (e) => {
        // Ignore user cancellation errors (triggered by synth.cancel())
        if (e.error !== 'interrupted') {
          console.error('SpeechSynthesisUtterance error:', e);
        }
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.error('TTS execution failed:', e);
    }
  }

  /**
   * Stop active speech.
   */
  stop() {
    if (this.isSupported) {
      this.synth.cancel();
    }
  }

  dispatchTtsError() {
    // Custom event to notify components if needed
    window.dispatchEvent(new CustomEvent('tts-unsupported'));
  }
}

export const ttsEngine = new TTSEngine();
