/* ==========================================================================
   VocaFlow - Vocabulary Browser (Word List View)
   ========================================================================== */

import { stateManager } from '../state.js';
import { ttsEngine } from '../tts.js';
import { showToast } from '../app.js';
import { dbManager } from '../db.js';

class WordsView {
  constructor(params) {
    this.dayNum = parseInt(params.day) || 1;
    this.words = [];
    this.searchQuery = '';
    this.activeFilter = 'all'; // 'all' | 'study' | 'starred'
    this.blurMeanings = stateManager.getBlurMeanings();
    this.container = null;
  }

  /**
   * Render view DOM.
   */
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'words-view-container';

    // 1. Header
    const header = document.createElement('div');
    header.className = 'study-header';

    const backLink = document.createElement('a');
    backLink.href = '#/';
    backLink.className = 'back-link';
    backLink.id = 'words-back-btn';
    
    const backIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    backIcon.setAttribute('class', 'back-link-icon');
    backIcon.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z');
    backIcon.appendChild(path);

    const backText = document.createElement('span');
    backText.textContent = '대시보드';
    backLink.appendChild(backIcon);
    backLink.appendChild(backText);

    const title = document.createElement('div');
    title.className = 'study-title';
    title.textContent = `Day ${String(this.dayNum).padStart(2, '0')} 단어장`;

    const modeTabs = document.createElement('div');
    modeTabs.className = 'study-modes';

    const cardTab = document.createElement('button');
    cardTab.className = 'mode-tab';
    cardTab.textContent = '카드학습';
    cardTab.onclick = () => window.location.hash = `#/study?day=${this.dayNum}`;

    const listTab = document.createElement('button');
    listTab.className = 'mode-tab active';
    listTab.textContent = '단어장';

    const quizTab = document.createElement('button');
    quizTab.className = 'mode-tab';
    quizTab.textContent = '테스트';
    quizTab.onclick = () => window.location.hash = `#/quiz?day=${this.dayNum}`;

    modeTabs.appendChild(cardTab);
    modeTabs.appendChild(listTab);
    modeTabs.appendChild(quizTab);

    header.appendChild(backLink);
    header.appendChild(title);
    header.appendChild(modeTabs);
    this.container.appendChild(header);

    // 2. Fetch Data
    try {
      const data = await dbManager.getDayData(this.dayNum);
      if (!data) {
        throw new Error('해당 단어장이 존재하지 않습니다. 설정에서 단어장을 업로드해주세요.');
      }
      this.words = data.words || [];

      this.renderControls();
      this.renderWordList();
    } catch (e) {
      this.renderErrorState(e.message);
    }

    return this.container;
  }

  renderControls() {
    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'words-header-actions';

    // Search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-input-container';

    // Inside search icon
    const sIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sIcon.setAttribute('class', 'search-icon-inside');
    sIcon.setAttribute('viewBox', '0 0 24 24');
    const sPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sPath.setAttribute('d', 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z');
    sIcon.appendChild(sPath);
    searchContainer.appendChild(sIcon);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'search-input';
    input.placeholder = '현재 일차에서 단어 검색...';
    input.value = this.searchQuery;
    input.oninput = (e) => {
      this.searchQuery = e.target.value;
      this.renderWordList();
    };
    searchContainer.appendChild(input);
    controlsWrap.appendChild(searchContainer);

    // Filters group
    const filterGroup = document.createElement('div');
    filterGroup.style.display = 'flex';
    filterGroup.style.gap = '8px';

    // Filter: All
    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn ${this.activeFilter === 'all' ? 'active' : ''}`;
    allBtn.textContent = '모두 보기';
    allBtn.onclick = () => this.applyFilter('all', allBtn);
    filterGroup.appendChild(allBtn);

    // Filter: Study (Uncompleted)
    const studyBtn = document.createElement('button');
    studyBtn.className = `filter-btn ${this.activeFilter === 'study' ? 'active' : ''}`;
    studyBtn.textContent = '미암기 단어';
    studyBtn.onclick = () => this.applyFilter('study', studyBtn);
    filterGroup.appendChild(studyBtn);

    // Filter: Starred
    const starredBtn = document.createElement('button');
    starredBtn.className = `filter-btn ${this.activeFilter === 'starred' ? 'active' : ''}`;
    starredBtn.textContent = '중요 단어';
    starredBtn.onclick = () => this.applyFilter('starred', starredBtn);
    filterGroup.appendChild(starredBtn);

    // Filter: Meaning Hide Toggle
    const blurBtn = document.createElement('button');
    blurBtn.className = `filter-btn ${this.blurMeanings ? 'active' : ''}`;
    blurBtn.textContent = '뜻 가리기';
    blurBtn.onclick = () => {
      this.blurMeanings = !this.blurMeanings;
      stateManager.setBlurMeanings(this.blurMeanings);
      blurBtn.classList.toggle('active');
      this.renderWordList();
      showToast(this.blurMeanings ? '단어 뜻이 가려졌습니다. 클릭해서 확인하세요.' : '단어 뜻 가리기가 해제되었습니다.', 'info');
    };
    filterGroup.appendChild(blurBtn);

    controlsWrap.appendChild(filterGroup);
    this.container.appendChild(controlsWrap);
  }

  applyFilter(filterType, btnElement) {
    this.activeFilter = filterType;
    const filterBtns = this.container.querySelectorAll('.filter-btn');
    // Toggle active classes except meaning blur btn
    filterBtns.forEach(btn => {
      if (btn.textContent !== '뜻 가리기') {
        btn.classList.remove('active');
      }
    });
    btnElement.classList.add('active');
    this.renderWordList();
  }

  renderWordList() {
    const existingList = this.container.querySelector('.word-list-items');
    if (existingList) existingList.remove();

    const listWrap = document.createElement('div');
    listWrap.className = 'word-list-items';

    // Filter and Search logic
    const filtered = this.words.filter(w => {
      // Search matches
      const matchesSearch = w.word.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            w.meaning.toLowerCase().includes(this.searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Filter matches
      if (this.activeFilter === 'study') {
        return !stateManager.isMastered(this.dayNum, w.id);
      }
      if (this.activeFilter === 'starred') {
        return stateManager.isStarred(this.dayNum, w.id);
      }
      return true;
    });

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.style.textAlign = 'center';
      empty.style.padding = '40px';
      empty.style.color = 'var(--text-muted)';
      empty.textContent = '검색 또는 필터에 맞는 단어가 없습니다.';
      listWrap.appendChild(empty);
    } else {
      filtered.forEach(w => {
        const row = this.createWordRow(w);
        listWrap.appendChild(row);
      });
    }

    this.container.appendChild(listWrap);
  }

  createWordRow(wordData) {
    const row = document.createElement('div');
    row.className = 'word-row';

    // Left info block
    const leftBlock = document.createElement('div');
    leftBlock.className = 'word-info-left';

    // Star
    const starBtn = document.createElement('button');
    starBtn.className = `star-btn ${stateManager.isStarred(this.dayNum, wordData.id) ? 'starred' : ''}`;
    starBtn.setAttribute('aria-label', '중요 단어 표시');
    
    const starIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    starIcon.setAttribute('class', 'star-icon');
    starIcon.setAttribute('viewBox', '0 0 24 24');
    const starPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    starPath.setAttribute('d', 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z');
    starIcon.appendChild(starPath);
    starBtn.appendChild(starIcon);

    starBtn.onclick = () => {
      stateManager.toggleStar(this.dayNum, wordData.id);
      starBtn.classList.toggle('starred');
    };
    leftBlock.appendChild(starBtn);

    // Literal Display
    const textDisplay = document.createElement('div');
    textDisplay.className = 'word-voca-display';

    const wordVal = document.createElement('div');
    wordVal.className = 'word-literal';
    wordVal.textContent = wordData.word;
    textDisplay.appendChild(wordVal);

    const meaningVal = document.createElement('div');
    meaningVal.className = 'word-meaning-text';
    meaningVal.textContent = wordData.meaning;
    
    if (this.blurMeanings) {
      meaningVal.classList.add('hidden');
      meaningVal.onclick = () => {
        meaningVal.classList.remove('hidden');
        meaningVal.onclick = null; // Remove handler after click reveal
      };
    }
    textDisplay.appendChild(meaningVal);
    leftBlock.appendChild(textDisplay);
    row.appendChild(leftBlock);

    // Right Action block
    const rightBlock = document.createElement('div');
    rightBlock.className = 'word-actions-right';

    // Speak
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
      ttsEngine.speak(wordData.word);
    };
    rightBlock.appendChild(speakBtn);

    // Mastery checkbox
    const masteryBtn = document.createElement('button');
    masteryBtn.className = `check-mastery-btn ${stateManager.isMastered(this.dayNum, wordData.id) ? 'mastered' : ''}`;
    masteryBtn.title = '외운 단어로 완료 처리';
    masteryBtn.setAttribute('aria-label', '외운 단어로 완료 처리');
    
    const checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    checkIcon.setAttribute('class', 'check-icon');
    checkIcon.setAttribute('viewBox', '0 0 24 24');
    const checkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    checkPath.setAttribute('d', 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z');
    checkIcon.appendChild(checkPath);
    masteryBtn.appendChild(checkIcon);

    masteryBtn.onclick = () => {
      stateManager.toggleMastery(this.dayNum, wordData.id);
      masteryBtn.classList.toggle('mastered');
    };
    rightBlock.appendChild(masteryBtn);

    row.appendChild(rightBlock);
    return row;
  }

  renderErrorState(msg) {
    const errorWrap = document.createElement('div');
    errorWrap.style.textAlign = 'center';
    errorWrap.style.padding = '100px 24px';

    const title = document.createElement('h3');
    title.style.color = 'var(--accent-red)';
    title.style.marginBottom = '8px';
    title.textContent = '단어장 로드 오류';
    errorWrap.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = `단어 데이터를 읽을 수 없습니다: ${msg}`;
    errorWrap.appendChild(desc);

    this.container.appendChild(errorWrap);
  }

  destroy() {
    // No active listeners to release on word list
  }
}

export default WordsView;
