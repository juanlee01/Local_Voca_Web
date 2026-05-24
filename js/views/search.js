/* ==========================================================================
   VocaFlow - Global Search Dashboard (Safe DOM creation)
   ========================================================================== */

import { dbManager } from '../db.js';
import { stateManager } from '../state.js';
import { ttsEngine } from '../tts.js';

class SearchView {
  constructor(params) {
    this.params = params;
    this.container = null;
    this.searchTimeout = null;
  }

  /**
   * Render view DOM.
   */
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'search-view-container';

    // 1. Header & Title
    const header = document.createElement('div');
    header.className = 'search-header-container';

    const h1 = document.createElement('h1');
    h1.style.fontFamily = 'Outfit, sans-serif';
    h1.style.fontSize = '32px';
    h1.style.fontWeight = '700';
    h1.textContent = '단어 검색';
    header.appendChild(h1);

    const desc = document.createElement('div');
    desc.className = 'search-description';
    desc.textContent = '전체 50개 일차(2,500 단어)에서 영단어 또는 뜻을 실시간으로 검색합니다.';
    header.appendChild(desc);
    this.container.appendChild(header);

    // 2. Search Box Inputs
    const searchBar = document.createElement('div');
    searchBar.className = 'words-header-actions';
    searchBar.style.marginBottom = '32px';

    const searchInputWrap = document.createElement('div');
    searchInputWrap.className = 'search-input-container';

    const sIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sIcon.setAttribute('class', 'search-icon-inside');
    sIcon.setAttribute('viewBox', '0 0 24 24');
    const sPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sPath.setAttribute('d', 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z');
    sIcon.appendChild(sPath);
    searchInputWrap.appendChild(sIcon);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'search-input';
    input.placeholder = '검색할 단어 또는 한글 뜻 입력...';
    input.autofocus = true;

    input.oninput = (e) => {
      this.debounceSearch(e.target.value);
    };

    searchInputWrap.appendChild(input);
    searchBar.appendChild(searchInputWrap);
    this.container.appendChild(searchBar);

    // 3. Results Section wrapper
    const resultsSection = document.createElement('div');
    resultsSection.className = 'search-results-section';
    this.container.appendChild(resultsSection);

    // Default Empty Prompt
    this.renderInitialState();

    return this.container;
  }

  debounceSearch(query) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.executeSearch(query);
    }, 150);
  }

  async executeSearch(query) {
    const resultsWrap = this.container.querySelector('.search-results-section');
    if (!resultsWrap) return;

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      this.renderInitialState();
      return;
    }

    // Show small spinner inline or loading text
    resultsWrap.replaceChildren();
    const loadingText = document.createElement('div');
    loadingText.className = 'search-empty-state';
    loadingText.textContent = '검색 중...';
    resultsWrap.appendChild(loadingText);

    try {
      const matches = await dbManager.search(cleanQuery);
      resultsWrap.replaceChildren();

      if (matches.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'search-empty-state';
        noResults.textContent = `"${cleanQuery}"에 대한 검색 결과가 없습니다.`;
        resultsWrap.appendChild(noResults);
      } else {
        matches.forEach(item => {
          const row = this.createSearchResultRow(item);
          resultsWrap.appendChild(row);
        });
      }
    } catch (e) {
      console.error('Search query execute failed:', e);
      resultsWrap.replaceChildren();
      const err = document.createElement('div');
      err.className = 'search-empty-state';
      err.style.color = 'var(--accent-red)';
      err.textContent = '검색에 실패했습니다. 인덱서 로딩 중일 수 있습니다.';
      resultsWrap.appendChild(err);
    }
  }

  createSearchResultRow(wordDoc) {
    const row = document.createElement('div');
    row.className = 'search-result-row';

    // Left block
    const leftBlock = document.createElement('div');
    leftBlock.className = 'word-info-left';

    // Star
    const starBtn = document.createElement('button');
    starBtn.className = `star-btn ${stateManager.isStarred(wordDoc.day, wordDoc.id) ? 'starred' : ''}`;
    starBtn.setAttribute('aria-label', '중요 단어 표시');
    
    const starIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    starIcon.setAttribute('class', 'star-icon');
    starIcon.setAttribute('viewBox', '0 0 24 24');
    const starPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    starPath.setAttribute('d', 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z');
    starIcon.appendChild(starPath);
    starBtn.appendChild(starIcon);

    starBtn.onclick = () => {
      stateManager.toggleStar(wordDoc.day, wordDoc.id);
      starBtn.classList.toggle('starred');
    };
    leftBlock.appendChild(starBtn);

    // Words text
    const textDisplay = document.createElement('div');
    textDisplay.className = 'word-voca-display';

    const wordVal = document.createElement('div');
    wordVal.className = 'word-literal';
    wordVal.textContent = wordDoc.word;
    textDisplay.appendChild(wordVal);

    const meaningVal = document.createElement('div');
    meaningVal.className = 'word-meaning-text';
    meaningVal.textContent = wordDoc.meaning;
    textDisplay.appendChild(meaningVal);
    leftBlock.appendChild(textDisplay);
    row.appendChild(leftBlock);

    // Right Action Block
    const rightBlock = document.createElement('div');
    rightBlock.className = 'word-actions-right';

    // TTS Speak button
    const speakBtn = document.createElement('button');
    speakBtn.className = 'row-audio-btn';
    speakBtn.title = '발음 듣기';
    speakBtn.setAttribute('aria-label', '발음 듣기');
    
    const speakIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    speakIcon.setAttribute('class', 'nav-icon');
    speakIcon.setAttribute('viewBox', '0 0 24 24');
    const speakPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    speakPath.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
    speakIcon.appendChild(speakPath);
    speakBtn.appendChild(speakIcon);
    speakBtn.onclick = () => {
      ttsEngine.speak(wordDoc.word);
    };
    rightBlock.appendChild(speakBtn);

    // Day navigation badge link
    const dayBadge = document.createElement('a');
    dayBadge.className = 'result-badge';
    dayBadge.href = `#/words?day=${wordDoc.day}`;
    dayBadge.textContent = `Day ${String(wordDoc.day).padStart(2, '0')}`;
    rightBlock.appendChild(dayBadge);

    row.appendChild(rightBlock);
    return row;
  }

  renderInitialState() {
    const resultsWrap = this.container.querySelector('.search-results-section');
    if (!resultsWrap) return;

    resultsWrap.replaceChildren();
    
    const emptyState = document.createElement('div');
    emptyState.className = 'search-empty-state';
    emptyState.textContent = '검색어를 입력하시면 일치하는 영단어 또는 한글 뜻을 찾아드립니다.';
    resultsWrap.appendChild(emptyState);
  }

  destroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}

export default SearchView;
