/* ==========================================================================
   VocaFlow - Hash-Based Router & Lifecycle Manager
   ========================================================================== */

import { ttsEngine } from './tts.js';

class HashRouter {
  constructor(viewportId) {
    this.viewport = document.getElementById(viewportId);
    this.currentView = null;
    this.routes = {
      '/': () => import('./views/dashboard.js'),
      '/study': () => import('./views/study.js'),
      '/quiz': () => import('./views/quiz.js'),
      '/words': () => import('./views/words.js'),
      '/search': () => import('./views/search.js'),
      '/settings': () => import('./views/settings.js')
    };

    window.addEventListener('hashchange', () => this.handleRoute());
  }

  /**
   * Start router.
   */
  start() {
    this.handleRoute();
  }

  /**
   * Handle active routing based on hash changes.
   */
  async handleRoute() {
    const rawHash = window.location.hash || '#/';
    
    // Stop any speech output when changing pages
    ttsEngine.stop();

    // Parse route and query params
    const { path, params } = this.parseHash(rawHash);

    // Update active nav styling
    this.updateNavigationUI(path);

    // Resolve matching view
    const viewResolver = this.routes[path];
    if (!viewResolver) {
      // 404 fallback: redirect to dashboard
      window.location.hash = '#/';
      return;
    }

    // Show loading spinner
    this.showLoader();

    try {
      // Cleanup previous view if necessary
      if (this.currentView && typeof this.currentView.destroy === 'function') {
        this.currentView.destroy();
      }

      // Dynamically load view module
      const module = await viewResolver();
      const ViewClass = module.default;

      // Create new view instance
      const viewInstance = new ViewClass(params);
      this.currentView = viewInstance;

      // Render view inside viewport securely
      const element = await viewInstance.render();
      
      // Clear viewport and mount element
      this.viewport.replaceChildren();
      this.viewport.appendChild(element);

      // Trigger post-render callbacks if they exist
      if (typeof viewInstance.afterRender === 'function') {
        viewInstance.afterRender();
      }
    } catch (e) {
      console.error(`Router failed loading path ${path}:`, e);
      this.renderErrorState(e.message);
    }
  }

  /**
   * Parse hash string into path and query dictionary.
   * e.g., "#/study?day=12&type=cards" -> { path: "/study", params: { day: "12", type: "cards" } }
   * @param {string} hash
   */
  parseHash(hash) {
    const cleanHash = hash.replace(/^#/, '');
    const [pathPart, queryPart] = cleanHash.split('?');
    
    const path = pathPart || '/';
    const params = {};

    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }
    }

    return { path, params };
  }

  /**
   * Show dynamic CSS spinner in viewport.
   */
  showLoader() {
    this.viewport.replaceChildren();
    
    const container = document.createElement('div');
    container.className = 'loader-container';

    const spinner = document.createElement('div');
    spinner.className = 'loader-spinner';

    const text = document.createElement('div');
    text.className = 'loader-text';
    text.textContent = '화면을 구성 중입니다...';

    container.appendChild(spinner);
    container.appendChild(text);
    this.viewport.appendChild(container);
  }

  /**
   * Render error boundary state in viewport.
   */
  renderErrorState(message) {
    this.viewport.replaceChildren();

    const container = document.createElement('div');
    container.style.padding = '40px';
    container.style.textAlign = 'center';

    const title = document.createElement('h2');
    title.style.color = 'var(--accent-red)';
    title.style.marginBottom = '12px';
    title.textContent = '화면을 로드할 수 없습니다';

    const desc = document.createElement('p');
    desc.style.color = 'var(--text-secondary)';
    desc.textContent = `오류 내용: ${message}`;

    const retryBtn = document.createElement('button');
    retryBtn.className = 'settings-btn btn-secondary';
    retryBtn.style.marginTop = '24px';
    retryBtn.style.display = 'inline-block';
    retryBtn.style.width = 'auto';
    retryBtn.textContent = '다시 시도';
    retryBtn.onclick = () => this.handleRoute();

    container.appendChild(title);
    container.appendChild(desc);
    container.appendChild(retryBtn);
    this.viewport.appendChild(container);
  }

  /**
   * Apply matching CSS active class to header navigation elements.
   * @param {string} path
   */
  updateNavigationUI(path) {
    const navItems = document.querySelectorAll('#header-nav .nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
    });

    if (path === '/') {
      const home = document.getElementById('nav-home');
      if (home) home.classList.add('active');
    } else if (path === '/search') {
      const search = document.getElementById('nav-search');
      if (search) search.classList.add('active');
    } else if (path === '/settings') {
      const settings = document.getElementById('nav-settings');
      if (settings) settings.classList.add('active');
    }
  }
}

export default HashRouter;
