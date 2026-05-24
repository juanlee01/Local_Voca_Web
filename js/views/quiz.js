/* ==========================================================================
   VocaFlow - Vocabulary Multiple-Choice Quiz View
   ========================================================================== */

import { stateManager } from '../state.js';
import { showToast } from '../app.js';
import { dbManager } from '../db.js';

class QuizView {
  constructor(params) {
    this.dayNum = parseInt(params.day) || 1;
    this.words = [];
    this.quizSubset = []; // 10 random words for the quiz
    this.currentIndex = 0;
    this.score = 0;
    this.wrongAnswers = []; // Log wrong questions for post-review
    this.container = null;
    this.isOptionLocked = false;
  }

  /**
   * Render view DOM.
   */
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'quiz-container';

    // 1. Header
    const header = document.createElement('div');
    header.className = 'study-header';

    const backLink = document.createElement('a');
    backLink.href = '#/';
    backLink.className = 'back-link';
    backLink.id = 'quiz-back-btn';
    
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
    title.textContent = `Day ${String(this.dayNum).padStart(2, '0')} 단어 테스트`;

    const modeTabs = document.createElement('div');
    modeTabs.className = 'study-modes';

    const cardTab = document.createElement('button');
    cardTab.className = 'mode-tab';
    cardTab.textContent = '카드학습';
    cardTab.onclick = () => window.location.hash = `#/study?day=${this.dayNum}`;

    const listTab = document.createElement('button');
    listTab.className = 'mode-tab';
    listTab.textContent = '단어장';
    listTab.onclick = () => window.location.hash = `#/words?day=${this.dayNum}`;

    const quizTab = document.createElement('button');
    quizTab.className = 'mode-tab active';
    quizTab.textContent = '테스트';

    modeTabs.appendChild(cardTab);
    modeTabs.appendChild(listTab);
    modeTabs.appendChild(quizTab);

    header.appendChild(backLink);
    header.appendChild(title);
    header.appendChild(modeTabs);
    this.container.appendChild(header);

    // 2. Fetch Data & Build Quiz
    try {
      const data = await dbManager.getDayData(this.dayNum);
      if (!data) {
        throw new Error('해당 단어장이 존재하지 않습니다. 설정에서 단어장을 업로드해주세요.');
      }
      this.words = data.words || [];

      if (this.words.length < 4) {
        throw new Error('선다형 테스트를 만들기 위한 단어 개수가 부족합니다 (최소 4개).');
      }

      this.generateQuizSubset();
      this.renderQuestion();
    } catch (e) {
      this.renderErrorState(e.message);
    }

    return this.container;
  }

  generateQuizSubset() {
    // Pick 10 random words from the day's vocabulary
    const shuffled = [...this.words].sort(() => 0.5 - Math.random());
    this.quizSubset = shuffled.slice(0, 10);
    this.currentIndex = 0;
    this.score = 0;
    this.wrongAnswers = [];
  }

  renderQuestion() {
    // Clear dynamic wraps
    const existingCard = this.container.querySelector('.quiz-card');
    if (existingCard) existingCard.remove();
    const existingResult = this.container.querySelector('.quiz-result-view');
    if (existingResult) existingResult.remove();

    this.isOptionLocked = false;
    const currentWord = this.quizSubset[this.currentIndex];

    // Build options (1 correct, 3 random distractors from words list)
    const distractors = this.words
      .filter(w => w.id !== currentWord.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = [currentWord, ...distractors].sort(() => 0.5 - Math.random());

    const quizCard = document.createElement('div');
    quizCard.className = 'quiz-card';

    // ProgressBar
    const progressTrack = document.createElement('div');
    progressTrack.className = 'progress-track';
    progressTrack.style.marginBottom = '24px';
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${(this.currentIndex / this.quizSubset.length) * 100}%`;
    progressTrack.appendChild(progressFill);
    quizCard.appendChild(progressTrack);

    const qNum = document.createElement('div');
    qNum.className = 'quiz-question-num';
    qNum.textContent = `문제 ${this.currentIndex + 1} / ${this.quizSubset.length}`;
    quizCard.appendChild(qNum);

    const qWord = document.createElement('div');
    qWord.className = 'quiz-question-word';
    qWord.textContent = currentWord.word;
    quizCard.appendChild(qWord);

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'quiz-options';

    options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.textContent = `${idx + 1}. ${opt.meaning.split('\n')[0]}`; // Show first meaning line for space efficiency
      
      btn.onclick = () => this.handleOptionClick(btn, opt, currentWord);
      optionsContainer.appendChild(btn);
    });

    quizCard.appendChild(optionsContainer);
    this.container.appendChild(quizCard);
  }

  handleOptionClick(clickedBtn, selectedOption, correctWord) {
    if (this.isOptionLocked) return;
    this.isOptionLocked = true;

    const allButtons = this.container.querySelectorAll('.quiz-option-btn');
    let isCorrect = selectedOption.id === correctWord.id;

    if (isCorrect) {
      this.score++;
      clickedBtn.classList.add('correct');
      showToast('정답입니다!', 'success');
    } else {
      clickedBtn.classList.add('wrong');
      this.wrongAnswers.push({
        word: correctWord.word,
        correctMeaning: correctWord.meaning,
        selectedMeaning: selectedOption.meaning
      });
      showToast('오답입니다.', 'error');
      
      // Highlight the correct answer
      allButtons.forEach(btn => {
        if (btn.textContent.includes(correctWord.meaning.split('\n')[0])) {
          btn.classList.add('correct');
        }
      });
    }

    // Disable all options
    allButtons.forEach(btn => {
      btn.style.cursor = 'default';
    });

    // Advance to next question after 1.5s
    setTimeout(() => {
      this.currentIndex++;
      if (this.currentIndex < this.quizSubset.length) {
        this.renderQuestion();
      } else {
        this.renderResults();
      }
    }, 1500);
  }

  renderResults() {
    const existingCard = this.container.querySelector('.quiz-card');
    if (existingCard) existingCard.remove();

    const resultWrap = document.createElement('div');
    resultWrap.className = 'quiz-result-view';

    const emoji = document.createElement('div');
    emoji.className = 'result-emoji';
    
    let emojiText = '👏';
    let remark = '잘하셨습니다!';
    if (this.score === 10) {
      emojiText = '👑';
      remark = '완벽합니다!';
    } else if (this.score < 5) {
      emojiText = '📚';
      remark = '더 복습해볼까요?';
    }
    
    emoji.textContent = emojiText;
    resultWrap.appendChild(emoji);

    const title = document.createElement('h2');
    title.className = 'result-title';
    title.textContent = `${remark} (${this.score} / ${this.quizSubset.length})`;
    resultWrap.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'result-score';
    desc.textContent = `Day ${this.dayNum} 테스트 완료.`;
    resultWrap.appendChild(desc);

    // Star study suggestions if any wrong
    if (this.wrongAnswers.length > 0) {
      const reviewBox = document.createElement('div');
      reviewBox.style.background = 'var(--bg-surface)';
      reviewBox.style.border = '1px solid var(--border-color)';
      reviewBox.style.borderRadius = 'var(--border-radius-md)';
      reviewBox.style.padding = '20px';
      reviewBox.style.marginTop = '24px';
      reviewBox.style.marginBottom = '32px';
      reviewBox.style.textAlign = 'left';

      const reviewTitle = document.createElement('h4');
      reviewTitle.style.marginBottom = '12px';
      reviewTitle.style.color = 'var(--accent-red)';
      reviewTitle.textContent = '오답 검토:';
      reviewBox.appendChild(reviewTitle);

      const list = document.createElement('ul');
      list.style.listStyleType = 'none';
      list.style.paddingLeft = '0';
      
      this.wrongAnswers.forEach(item => {
        const li = document.createElement('li');
        li.style.marginBottom = '10px';
        li.style.fontSize = '14px';

        const boldWord = document.createElement('strong');
        boldWord.style.color = 'var(--text-primary)';
        boldWord.textContent = `${item.word} : `;

        const meanText = document.createElement('span');
        meanText.style.color = 'var(--text-secondary)';
        meanText.textContent = item.correctMeaning.replace(/\n/g, ' / ');

        li.appendChild(boldWord);
        li.appendChild(meanText);
        list.appendChild(li);
      });

      reviewBox.appendChild(list);
      resultWrap.appendChild(reviewBox);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'result-actions';

    const restartBtn = document.createElement('button');
    restartBtn.className = 'settings-btn btn-secondary';
    restartBtn.style.width = 'auto';
    restartBtn.textContent = '다시 풀기';
    restartBtn.onclick = () => {
      this.generateQuizSubset();
      this.renderQuestion();
    };

    const studyBtn = document.createElement('button');
    studyBtn.className = 'settings-btn btn-secondary';
    studyBtn.style.background = 'var(--accent-purple)';
    studyBtn.style.borderColor = 'var(--accent-purple)';
    studyBtn.style.color = '#fff';
    studyBtn.style.width = 'auto';
    studyBtn.textContent = '카드 복습하기';
    studyBtn.onclick = () => {
      window.location.hash = `#/study?day=${this.dayNum}`;
    };

    const dashboardBtn = document.createElement('button');
    dashboardBtn.className = 'settings-btn btn-secondary';
    dashboardBtn.style.width = 'auto';
    dashboardBtn.textContent = '대시보드로';
    dashboardBtn.onclick = () => {
      window.location.hash = '#/';
    };

    actions.appendChild(restartBtn);
    actions.appendChild(studyBtn);
    actions.appendChild(dashboardBtn);
    resultWrap.appendChild(actions);

    this.container.appendChild(resultWrap);
  }

  renderErrorState(msg) {
    const errorWrap = document.createElement('div');
    errorWrap.style.textAlign = 'center';
    errorWrap.style.padding = '100px 24px';

    const title = document.createElement('h3');
    title.style.color = 'var(--accent-red)';
    title.style.marginBottom = '8px';
    title.textContent = '테스트 로드 오류';
    errorWrap.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = `테스트를 구성할 수 없습니다: ${msg}`;
    errorWrap.appendChild(desc);

    this.container.appendChild(errorWrap);
  }

  destroy() {
    // No active listeners to release on quiz
  }
}

export default QuizView;
