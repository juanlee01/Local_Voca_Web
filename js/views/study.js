/* ==========================================================================
   VocaFlow - Flashcard Study View
   ========================================================================== */

import { stateManager } from '../state.js';
import { ttsEngine } from '../tts.js';
import { showToast } from '../app.js';
import { dbManager } from '../db.js';

class StudyView {
  constructor(params) {
    this.dayNum = parseInt(params.day) || 1;
    this.words = [];
    this.currentIndex = 0;
    this.reviewQueue = []; // Index array of words to study
    this.container = null;
    this.keyboardHandler = this.handleKeyDown.bind(this);
  }

  /**
   * Render view DOM.
   * @returns {HTMLElement}
   */
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'study-view-container';

    // 1. Header Section
    const header = document.createElement('div');
    header.className = 'study-header';

    const backLink = document.createElement('a');
    backLink.href = '#/';
    backLink.className = 'back-link';
    backLink.id = 'study-back-btn';
    
    // SVG back icon
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
    title.textContent = `Day ${String(this.dayNum).padStart(2, '0')} 카드 학습`;

    // Mode Selector Tabs
    const modeTabs = document.createElement('div');
    modeTabs.className = 'study-modes';

    const cardTab = document.createElement('button');
    cardTab.className = 'mode-tab active';
    cardTab.textContent = '카드학습';

    const listTab = document.createElement('button');
    listTab.className = 'mode-tab';
    listTab.textContent = '단어장';
    listTab.onclick = () => window.location.hash = `#/words?day=${this.dayNum}`;

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

    // 2. Load Data
    try {
      const data = await dbManager.getDayData(this.dayNum);
      if (!data) {
        throw new Error('해당 단어장이 존재하지 않습니다. 설정에서 단어장을 업로드해주세요.');
      }
      this.words = data.words || [];
      
      // Initialize study queue (unmastered words first, or all words if none is completed)
      const dayProgress = stateManager.getDayProgress(this.dayNum);
      const unmasteredIndexes = [];
      this.words.forEach((w, idx) => {
        if (!dayProgress.mastered.includes(w.id)) {
          unmasteredIndexes.push(idx);
        }
      });

      if (unmasteredIndexes.length === 0) {
        // If all mastered, load all words for review
        this.reviewQueue = this.words.map((_, idx) => idx);
      } else {
        this.reviewQueue = unmasteredIndexes;
      }

      this.currentIndex = 0;

      if (this.reviewQueue.length === 0) {
        this.renderEmptyState();
      } else {
        this.renderCardInterface();
      }
    } catch (e) {
      this.renderErrorState(e.message);
    }

    return this.container;
  }

  afterRender() {
    // Add keyboard shortcuts
    window.addEventListener('keydown', this.keyboardHandler);
    
    // Automatically play first word audio
    this.playCurrentWordAudio();
  }

  renderCardInterface() {
    // Clear dynamic parts if redraw
    const existingInterface = this.container.querySelector('.study-interface-wrap');
    if (existingInterface) existingInterface.remove();
    const existingFinished = this.container.querySelector('.quiz-result-view');
    if (existingFinished) existingFinished.remove();

    const interfaceWrap = document.createElement('div');
    interfaceWrap.className = 'study-interface-wrap';

    // Progress Bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'study-progress-container';
    
    // Auto Play Toggle Button (Icon with speaker/mute)
    const autoPlayBtn = document.createElement('button');
    autoPlayBtn.className = 'action-btn';
    autoPlayBtn.style.width = 'auto';
    autoPlayBtn.style.padding = '0 12px';
    autoPlayBtn.style.display = 'flex';
    autoPlayBtn.style.alignItems = 'center';
    autoPlayBtn.style.gap = '6px';
    autoPlayBtn.style.fontSize = '12px';
    autoPlayBtn.style.fontWeight = '600';
    
    const isAuto = stateManager.getAutoPlayTts();
    autoPlayBtn.title = isAuto ? '자동 발음 재생 켜짐' : '자동 발음 재생 꺼짐';
    autoPlayBtn.setAttribute('aria-label', '자동 발음 재생 토글');
    
    const speakIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    speakIcon.setAttribute('class', 'nav-icon');
    speakIcon.setAttribute('viewBox', '0 0 24 24');
    speakIcon.style.width = '16px';
    speakIcon.style.height = '16px';
    const speakPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    if (isAuto) {
      speakPath.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
      autoPlayBtn.style.borderColor = 'var(--accent-purple)';
      autoPlayBtn.style.color = 'var(--accent-purple)';
      autoPlayBtn.style.background = 'var(--accent-purple-glow)';
    } else {
      speakPath.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z');
      autoPlayBtn.style.borderColor = 'var(--border-color)';
      autoPlayBtn.style.color = 'var(--text-muted)';
    }
    speakIcon.appendChild(speakPath);
    autoPlayBtn.appendChild(speakIcon);
    
    const labelSpan = document.createElement('span');
    labelSpan.textContent = isAuto ? '자동 재생 On' : '자동 재생 Off';
    autoPlayBtn.appendChild(labelSpan);

    autoPlayBtn.onclick = () => {
      const nextAuto = !stateManager.getAutoPlayTts();
      stateManager.setAutoPlayTts(nextAuto);
      showToast(nextAuto ? '단어 전환 시 발음이 자동 재생됩니다.' : '자동 발음 재생이 꺼졌습니다.', 'info');
      this.renderCardInterface();
    };

    const progressTrack = document.createElement('div');
    progressTrack.className = 'progress-track';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    const percent = ((this.currentIndex) / this.reviewQueue.length) * 100;
    progressFill.style.width = `${percent}%`;
    progressTrack.appendChild(progressFill);

    const progressCounter = document.createElement('div');
    progressCounter.className = 'progress-counter';
    progressCounter.textContent = `${this.currentIndex + 1} / ${this.reviewQueue.length}`;

    progressContainer.appendChild(autoPlayBtn);
    progressContainer.appendChild(progressTrack);
    progressContainer.appendChild(progressCounter);
    interfaceWrap.appendChild(progressContainer);

    // Deck & 3D Card
    const deck = document.createElement('div');
    deck.className = 'card-deck';

    const wordIdx = this.reviewQueue[this.currentIndex];
    const wordData = this.words[wordIdx];

    const card = document.createElement('div');
    card.className = 'flashcard';
    card.id = 'flashcard-element';

    // Front Face
    const front = document.createElement('div');
    front.className = 'card-face card-front';
    
    // Star toggle on card front (top right)
    const starBtn = document.createElement('button');
    starBtn.className = `star-btn ${stateManager.isStarred(this.dayNum, wordData.id) ? 'starred' : ''}`;
    starBtn.setAttribute('aria-label', '중요 단어 표시');
    starBtn.style.position = 'absolute';
    starBtn.style.top = '20px';
    starBtn.style.right = '24px';
    
    const starIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    starIcon.setAttribute('class', 'star-icon');
    starIcon.setAttribute('viewBox', '0 0 24 24');
    const starPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    starPath.setAttribute('d', 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z');
    starIcon.appendChild(starPath);
    starBtn.appendChild(starIcon);
    starBtn.onclick = (e) => {
      e.stopPropagation();
      stateManager.toggleStar(this.dayNum, wordData.id);
      starBtn.classList.toggle('starred');
      showToast(stateManager.isStarred(this.dayNum, wordData.id) ? '중요 단어로 등록되었습니다.' : '중요 단어가 해제되었습니다.', 'info');
    };

    front.appendChild(starBtn);

    const frontWord = document.createElement('div');
    frontWord.className = 'card-word';
    frontWord.textContent = wordData.word;
    front.appendChild(frontWord);

    const hint = document.createElement('div');
    hint.className = 'card-hint';
    hint.textContent = '클릭하여 뜻 확인 (Space)';
    front.appendChild(hint);

    // TTS speaker on front
    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'tts-btn';
    ttsBtn.title = '발음 듣기';
    ttsBtn.setAttribute('aria-label', '발음 듣기');
    
    const ttsIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ttsIcon.setAttribute('class', 'tts-icon');
    ttsIcon.setAttribute('viewBox', '0 0 24 24');
    const ttsPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    ttsPath.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
    ttsIcon.appendChild(ttsPath);
    ttsBtn.appendChild(ttsIcon);
    
    ttsBtn.onclick = (e) => {
      e.stopPropagation();
      ttsEngine.speak(wordData.word);
    };
    front.appendChild(ttsBtn);

    // Back Face
    const back = document.createElement('div');
    back.className = 'card-face card-back';

    const backWord = document.createElement('div');
    backWord.className = 'card-word';
    backWord.style.fontSize = '24px';
    backWord.style.color = 'var(--text-secondary)';
    backWord.textContent = wordData.word;
    back.appendChild(backWord);

    const meaning = document.createElement('div');
    meaning.className = 'card-meaning';
    meaning.textContent = wordData.meaning;
    back.appendChild(meaning);

    card.appendChild(front);
    card.appendChild(back);
    deck.appendChild(card);
    interfaceWrap.appendChild(deck);

    // Card click flip listener
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
    });

    // Control Panel Buttons
    const controls = document.createElement('div');
    controls.className = 'card-controls';

    const retryBtn = document.createElement('button');
    retryBtn.className = 'control-btn btn-retry';
    retryBtn.id = 'btn-retry';
    retryBtn.textContent = '학습 필요 (←)';
    retryBtn.onclick = () => this.handleAnswer(false);

    const knowBtn = document.createElement('button');
    knowBtn.className = 'control-btn btn-memorized';
    knowBtn.id = 'btn-memorized';
    knowBtn.textContent = '알아요 (→)';
    knowBtn.onclick = () => this.handleAnswer(true);

    controls.appendChild(retryBtn);
    controls.appendChild(knowBtn);
    interfaceWrap.appendChild(controls);

    // Add shortcuts hint underneath
    const shortcutHint = document.createElement('div');
    shortcutHint.style.textAlign = 'center';
    shortcutHint.style.color = 'var(--text-muted)';
    shortcutHint.style.fontSize = '12px';
    shortcutHint.style.marginTop = '20px';
    shortcutHint.textContent = '키보드 조작: 좌우 방향키로 선택 / Space바로 플립';
    interfaceWrap.appendChild(shortcutHint);

    this.container.appendChild(interfaceWrap);
  }

  handleKeyDown(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      const card = document.getElementById('flashcard-element');
      if (card) card.classList.toggle('flipped');
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      this.handleAnswer(false);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      this.handleAnswer(true);
    }
  }

  playCurrentWordAudio() {
    if (!stateManager.getAutoPlayTts()) return;
    if (this.reviewQueue.length === 0) return;
    const wordIdx = this.reviewQueue[this.currentIndex];
    const wordData = this.words[wordIdx];
    if (wordData) {
      // Small timeout to allow transition to settle
      setTimeout(() => ttsEngine.speak(wordData.word), 300);
    }
  }

  handleAnswer(know) {
    if (this.reviewQueue.length === 0) return;

    const wordIdx = this.reviewQueue[this.currentIndex];
    const wordData = this.words[wordIdx];

    if (know) {
      // Mark as mastered in state manager
      if (!stateManager.isMastered(this.dayNum, wordData.id)) {
        stateManager.toggleMastery(this.dayNum, wordData.id);
      }
    }

    this.currentIndex++;

    if (this.currentIndex >= this.reviewQueue.length) {
      this.renderFinishedState();
    } else {
      this.renderCardInterface();
      this.playCurrentWordAudio();
    }
  }

  renderFinishedState() {
    // Clear interface
    const interfaceWrap = this.container.querySelector('.study-interface-wrap');
    if (interfaceWrap) interfaceWrap.remove();

    const finished = document.createElement('div');
    finished.className = 'quiz-result-view';

    const emoji = document.createElement('div');
    emoji.className = 'result-emoji';
    emoji.textContent = '🎉';
    finished.appendChild(emoji);

    const title = document.createElement('h2');
    title.className = 'result-title';
    title.textContent = '학습 완료!';
    finished.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'result-score';
    desc.textContent = `Day ${this.dayNum}의 단어 카드 학습 카드를 모두 확인하셨습니다.`;
    finished.appendChild(desc);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'result-actions';

    const restartBtn = document.createElement('button');
    restartBtn.className = 'settings-btn btn-secondary';
    restartBtn.style.width = 'auto';
    restartBtn.textContent = '다시 학습';
    restartBtn.onclick = () => {
      this.currentIndex = 0;
      this.reviewQueue = this.words.map((_, idx) => idx);
      this.renderCardInterface();
      this.playCurrentWordAudio();
    };

    const quizBtn = document.createElement('button');
    quizBtn.className = 'settings-btn btn-secondary';
    quizBtn.style.background = 'var(--accent-purple)';
    quizBtn.style.borderColor = 'var(--accent-purple)';
    quizBtn.style.color = '#fff';
    quizBtn.style.width = 'auto';
    quizBtn.textContent = '테스트 풀기';
    quizBtn.onclick = () => {
      window.location.hash = `#/quiz?day=${this.dayNum}`;
    };

    const dashboardBtn = document.createElement('button');
    dashboardBtn.className = 'settings-btn btn-secondary';
    dashboardBtn.style.width = 'auto';
    dashboardBtn.textContent = '대시보드로';
    dashboardBtn.onclick = () => {
      window.location.hash = '#/';
    };

    actions.appendChild(restartBtn);
    actions.appendChild(quizBtn);
    actions.appendChild(dashboardBtn);
    finished.appendChild(actions);

    this.container.appendChild(finished);
  }

  renderEmptyState() {
    const empty = document.createElement('div');
    empty.style.textAlign = 'center';
    empty.style.padding = '80px 24px';

    const emoji = document.createElement('div');
    emoji.style.fontSize = '48px';
    emoji.style.marginBottom = '16px';
    emoji.textContent = '✅';
    empty.appendChild(emoji);

    const text = document.createElement('h3');
    text.style.marginBottom = '12px';
    text.textContent = '오늘의 모든 단어를 이미 마스터하셨습니다!';
    empty.appendChild(text);

    const desc = document.createElement('p');
    desc.style.color = 'var(--text-secondary)';
    desc.style.marginBottom = '24px';
    desc.textContent = '단어장을 통해 개별 단어를 다시 확인하거나 복습 카드를 열어볼 수 있습니다.';
    empty.appendChild(desc);

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.justifyContent = 'center';
    btnGroup.style.gap = '12px';

    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'settings-btn btn-secondary';
    reviewBtn.style.width = 'auto';
    reviewBtn.textContent = '전체 단어 다시 카드 학습';
    reviewBtn.onclick = () => {
      this.reviewQueue = this.words.map((_, idx) => idx);
      this.currentIndex = 0;
      this.renderCardInterface();
      this.playCurrentWordAudio();
    };

    const listBtn = document.createElement('button');
    listBtn.className = 'settings-btn btn-secondary';
    listBtn.style.width = 'auto';
    listBtn.textContent = '단어장 보기';
    listBtn.onclick = () => {
      window.location.hash = `#/words?day=${this.dayNum}`;
    };

    btnGroup.appendChild(reviewBtn);
    btnGroup.appendChild(listBtn);
    empty.appendChild(btnGroup);
    this.container.appendChild(empty);
  }

  renderErrorState(msg) {
    const errorWrap = document.createElement('div');
    errorWrap.style.textAlign = 'center';
    errorWrap.style.padding = '100px 24px';

    const title = document.createElement('h3');
    title.style.color = 'var(--accent-red)';
    title.style.marginBottom = '8px';
    title.textContent = '학습 로드 오류';
    errorWrap.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = `단어 데이터를 읽을 수 없습니다: ${msg}`;
    errorWrap.appendChild(desc);

    this.container.appendChild(errorWrap);
  }

  destroy() {
    // Remove global listeners to avoid memory leaks
    window.removeEventListener('keydown', this.keyboardHandler);
  }
}

export default StudyView;
