/* ==========================================================================
   VocaFlow - Core App Bootstrapper & Global Controllers
   ========================================================================== */

import { stateManager } from './state.js';
import { dbManager } from './db.js';
import HashRouter from './router.js';

class App {
  constructor() {
    this.router = null;
  }

  /**
   * Bootstrap the application.
   */
  async init() {
    console.log('VocaFlow booting...');

    // 1. Initialize Theme from State
    this.applyTheme(stateManager.getTheme());
    
    // Subscribe to state updates to reactively update theme
    stateManager.subscribe((state) => {
      this.applyTheme(state.settings.theme);
    });

    // 2. Set up global DOM listeners
    this.setupGlobalEvents();

    // 3. Register Service Worker for offline PWA
    this.registerServiceWorker();

    // 4. Start Router
    this.router = new HashRouter('app-viewport');
    this.router.start();
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  setupGlobalEvents() {
    // Theme Toggle Button
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = stateManager.getTheme();
        stateManager.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
      });
    }

    // Logo Click Home Navigation
    const logo = document.getElementById('header-logo-container');
    if (logo) {
      logo.addEventListener('click', () => {
        window.location.hash = '#/';
      });
    }

    // Capture global TTS errors
    window.addEventListener('tts-unsupported', () => {
      this.showToast('이 브라우저는 음성 합성(TTS) 기능을 지원하지 않습니다.', 'error');
    });
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=2')
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(err => {
            console.error('ServiceWorker registration failed: ', err);
          });
      });
    }
  }

  /**
   * Show programmatically built toast notifications (Strictly safe, zero innerHTML).
   * @param {string} message
   * @param {'info' | 'success' | 'error'} type
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 3000);
  }
}

// Instantiate and start app
const app = new App();
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// Export showToast globally for view components to use
export function showToast(message, type) {
  app.showToast(message, type);
}
