/* ==========================================================================
   VocaFlow - State & Storage Manager (Versioned)
   ========================================================================== */

const STORAGE_KEY = 'vocaflow_user_data';
const CURRENT_VERSION = 2;

const DEFAULT_STATE = {
  version: CURRENT_VERSION,
  progress: {}, // Schema: { [dayNum]: { mastered: [wordIds], starred: [wordIds] } }
  settings: {
    theme: 'dark',
    ttsRate: 1.0,
    ttsPitch: 1.0,
    blurMeanings: false,
    autoPlayTts: true
  }
};

class StateManager {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadState();
  }

  /**
   * Load state from localStorage with schema migration support.
   */
  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }

      const parsed = JSON.parse(stored);
      
      // Handle version migration if necessary
      if (!parsed.version || parsed.version < CURRENT_VERSION) {
        return this.migrate(parsed);
      }

      // Safeguard structure
      if (!parsed.progress) parsed.progress = {};
      if (!parsed.settings) parsed.settings = JSON.parse(JSON.stringify(DEFAULT_STATE.settings));

      return parsed;
    } catch (e) {
      console.error('Failed to load state, reverting to defaults:', e);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  /**
   * Save state to localStorage.
   */
  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notify();
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  /**
   * Migrate state from older version schemas.
   * @param {Object} oldState
   */
  migrate(oldState) {
    console.log(`Migrating state from v${oldState.version || 'unknown'} to v${CURRENT_VERSION}`);
    
    const newState = {
      ...JSON.parse(JSON.stringify(DEFAULT_STATE)),
      ...oldState,
      settings: {
        ...DEFAULT_STATE.settings,
        ...(oldState.settings || {})
      },
      version: CURRENT_VERSION
    };
    
    this.state = newState;
    this.saveState();
    return newState;
  }

  // Getters
  getTheme() { return this.state.settings.theme; }
  getTtsRate() { return this.state.settings.ttsRate; }
  getTtsPitch() { return this.state.settings.ttsPitch; }
  getBlurMeanings() { return this.state.settings.blurMeanings; }
  getAutoPlayTts() { return this.state.settings.autoPlayTts !== false; }
  getLastStudiedDay() { return this.state.settings.lastStudiedDay || null; }

  getDayProgress(dayNum) {
    const dayStr = String(dayNum);
    if (!this.state.progress[dayStr]) {
      this.state.progress[dayStr] = { mastered: [], starred: [] };
    }
    return this.state.progress[dayStr];
  }

  getAllProgress() {
    return this.state.progress;
  }

  // Setters
  setTheme(theme) {
    this.state.settings.theme = theme === 'light' ? 'light' : 'dark';
    this.saveState();
  }

  setTtsRate(rate) {
    const r = parseFloat(rate);
    this.state.settings.ttsRate = isNaN(r) ? 1.0 : Math.max(0.5, Math.min(2.0, r));
    this.saveState();
  }

  setTtsPitch(pitch) {
    const p = parseFloat(pitch);
    this.state.settings.ttsPitch = isNaN(p) ? 1.0 : Math.max(0.5, Math.min(2.0, p));
    this.saveState();
  }

  setBlurMeanings(blur) {
    this.state.settings.blurMeanings = !!blur;
    this.saveState();
  }

  setAutoPlayTts(autoPlay) {
    this.state.settings.autoPlayTts = !!autoPlay;
    this.saveState();
  }

  setLastStudiedDay(dayNum) {
    this.state.settings.lastStudiedDay = parseInt(dayNum);
    this.saveState();
  }

  /**
   * Toggle a word's starred state.
   */
  toggleStar(dayNum, wordId) {
    const progress = this.getDayProgress(dayNum);
    const id = parseInt(wordId);
    
    const index = progress.starred.indexOf(id);
    if (index === -1) {
      progress.starred.push(id);
    } else {
      progress.starred.splice(index, 1);
    }
    this.saveState();
  }

  isStarred(dayNum, wordId) {
    const progress = this.getDayProgress(dayNum);
    return progress.starred.includes(parseInt(wordId));
  }

  /**
   * Toggle a word's mastery/completed status.
   */
  toggleMastery(dayNum, wordId) {
    const progress = this.getDayProgress(dayNum);
    const id = parseInt(wordId);
    
    const index = progress.mastered.indexOf(id);
    if (index === -1) {
      progress.mastered.push(id);
    } else {
      progress.mastered.splice(index, 1);
    }
    this.saveState();
  }

  isMastered(dayNum, wordId) {
    const progress = this.getDayProgress(dayNum);
    return progress.mastered.includes(parseInt(wordId));
  }

  /**
   * Star/unstar all words in a day.
   */
  setDayMastery(dayNum, wordIds, isAllMastered) {
    const progress = this.getDayProgress(dayNum);
    if (isAllMastered) {
      progress.mastered = [...wordIds];
    } else {
      progress.mastered = [];
    }
    this.saveState();
  }

  // Pub/Sub System
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('Error triggering state subscriber:', e);
      }
    }
  }

  /**
   * Import data securely.
   * Validate keys and types to prevent script injections or app crashes.
   */
  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON root type');
      }

      // Secure payload reconstruction
      const newProgress = {};
      const newSettings = JSON.parse(JSON.stringify(DEFAULT_STATE.settings));

      // 1. Validate settings
      if (parsed.settings && typeof parsed.settings === 'object') {
        if (parsed.settings.theme === 'light' || parsed.settings.theme === 'dark') {
          newSettings.theme = parsed.settings.theme;
        }
        if (typeof parsed.settings.ttsRate === 'number') {
          newSettings.ttsRate = Math.max(0.5, Math.min(2.0, parsed.settings.ttsRate));
        }
        if (typeof parsed.settings.ttsPitch === 'number') {
          newSettings.ttsPitch = Math.max(0.5, Math.min(2.0, parsed.settings.ttsPitch));
        }
        if (typeof parsed.settings.blurMeanings === 'boolean') {
          newSettings.blurMeanings = parsed.settings.blurMeanings;
        }
        if (typeof parsed.settings.autoPlayTts === 'boolean') {
          newSettings.autoPlayTts = parsed.settings.autoPlayTts;
        }
      }

      // 2. Validate progress
      if (parsed.progress && typeof parsed.progress === 'object') {
        for (const [dayKey, dayData] of Object.entries(parsed.progress)) {
          const dayNum = parseInt(dayKey);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 100) continue; // Boundary safeguard

          if (dayData && typeof dayData === 'object') {
            const mastered = Array.isArray(dayData.mastered)
              ? dayData.mastered.map(x => parseInt(x)).filter(x => !isNaN(x))
              : [];
            const starred = Array.isArray(dayData.starred)
              ? dayData.starred.map(x => parseInt(x)).filter(x => !isNaN(x))
              : [];

            newProgress[String(dayNum)] = { mastered, starred };
          }
        }
      }

      // Replace and save
      this.state = {
        version: CURRENT_VERSION,
        progress: newProgress,
        settings: newSettings
      };
      this.saveState();
      return { success: true };
    } catch (e) {
      console.error('Failed to parse and validate imported file:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Export state as a clean serialized JSON string.
   */
  exportData() {
    return JSON.stringify({
      version: this.state.version,
      progress: this.state.progress,
      settings: this.state.settings
    }, null, 2);
  }
}

// Single instance export
export const stateManager = new StateManager();
