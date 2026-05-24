/* ==========================================================================
   VocaFlow - Dashboard View (Programmatic, safe DOM creation)
   ========================================================================== */

import { stateManager } from '../state.js';
import { dbManager } from '../db.js';

class DashboardView {
  constructor(params) {
    this.params = params;
  }

  /**
   * Render view DOM.
   * @returns {HTMLElement}
   */
  async render() {
    const container = document.createElement('div');
    container.className = 'dashboard-container';

    // 1. Title Section
    const titleSection = document.createElement('div');
    titleSection.className = 'dashboard-title-section';

    const h1 = document.createElement('h1');
    h1.textContent = '학습 대시보드';
    
    titleSection.appendChild(h1);
    container.appendChild(titleSection);

    // Fetch all available days from IndexedDB
    const allDays = await dbManager.getAllDays();

    // 2. Empty State
    if (allDays.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.textAlign = 'center';
      emptyState.style.padding = '80px 24px';
      emptyState.style.background = 'var(--bg-surface)';
      emptyState.style.borderRadius = 'var(--border-radius-lg)';
      emptyState.style.border = '1px dashed var(--border-color)';
      emptyState.style.marginTop = '24px';

      const emoji = document.createElement('div');
      emoji.style.fontSize = '48px';
      emoji.style.marginBottom = '16px';
      emoji.textContent = '📁';
      emptyState.appendChild(emoji);

      const emptyTitle = document.createElement('h3');
      emptyTitle.style.marginBottom = '12px';
      emptyTitle.textContent = '등록된 단어장이 없습니다.';
      emptyState.appendChild(emptyTitle);

      const emptyDesc = document.createElement('p');
      emptyDesc.style.color = 'var(--text-secondary)';
      emptyDesc.style.marginBottom = '24px';
      emptyDesc.textContent = '설정 메뉴에서 단어장 JSON 파일을 임포트해주세요.';
      emptyState.appendChild(emptyDesc);

      const goSettingsBtn = document.createElement('button');
      goSettingsBtn.className = 'settings-btn';
      goSettingsBtn.style.width = 'auto';
      goSettingsBtn.style.padding = '0 24px';
      goSettingsBtn.textContent = '설정으로 이동하여 단어장 추가하기';
      goSettingsBtn.onclick = () => {
        window.location.hash = '#/settings';
      };
      emptyState.appendChild(goSettingsBtn);

      container.appendChild(emptyState);
      return container;
    }

    // 3. Calculate overall stats dynamically
    const progressData = stateManager.getAllProgress();
    let totalMasteredCount = 0;
    let totalStarredCount = 0;
    let completedDaysCount = 0;
    
    // To calculate accurate total words, we need to know how many words each day has.
    // For performance, we can assume 50 words per day by default unless we fetch all.
    // Let's fetch all day data to be perfectly accurate.
    const dayDatas = await Promise.all(allDays.map(day => dbManager.getDayData(day)));
    let totalWords = 0;

    allDays.forEach((dayStr, index) => {
      const dayData = dayDatas[index];
      const wordsPerDay = dayData ? (dayData.words ? dayData.words.length : 50) : 50;
      totalWords += wordsPerDay;

      const dayProgress = progressData[String(dayStr)];
      if (dayProgress) {
        totalMasteredCount += (dayProgress.mastered || []).length;
        totalStarredCount += (dayProgress.starred || []).length;
        if ((dayProgress.mastered || []).length >= wordsPerDay) {
          completedDaysCount++;
        }
      }
    });

    // 4. Stats Cards
    const statsSummary = document.createElement('div');
    statsSummary.className = 'stats-summary';

    const lastDay = stateManager.getLastStudiedDay();
    let recentDayText = '-';
    let recentDayDesc = '학습 기록이 없습니다';
    let nextDayText = '-';
    let nextDayDesc = '다음 단어장이 없습니다';
    
    let recentClick = null;
    let nextClick = null;

    const sortedDays = [...allDays].sort((a, b) => a - b);

    if (lastDay && allDays.includes(lastDay)) {
      recentDayText = `Day ${lastDay}`;
      recentDayDesc = '이어서 학습하기 ➔';
      recentClick = () => { window.location.hash = `#/study?day=${lastDay}`; };

      const currentIndex = sortedDays.indexOf(lastDay);
      if (currentIndex !== -1 && currentIndex + 1 < sortedDays.length) {
        const nextDay = sortedDays[currentIndex + 1];
        nextDayText = `Day ${nextDay}`;
        nextDayDesc = '새 단어장 학습하기 ➔';
        nextClick = () => { window.location.hash = `#/study?day=${nextDay}`; };
      } else {
        nextDayDesc = '마지막 단어장입니다';
      }
    } else if (sortedDays.length > 0) {
      const firstDay = sortedDays[0];
      recentDayText = '기록 없음';
      recentDayDesc = '학습을 시작해보세요';
      
      nextDayText = `Day ${firstDay}`;
      nextDayDesc = '첫 단어장 시작하기 ➔';
      nextClick = () => { window.location.hash = `#/study?day=${firstDay}`; };
    }

    const cardRecent = this.createStatCard('최근 학습', recentDayText, recentDayDesc, recentClick);
    const cardNext = this.createStatCard('다음 학습', nextDayText, nextDayDesc, nextClick);
    const cardCompleted = this.createStatCard('완습한 일수', `${completedDaysCount} / ${allDays.length} 일`, '모든 단어를 암기한 단어장 수');

    statsSummary.appendChild(cardRecent);
    statsSummary.appendChild(cardNext);
    statsSummary.appendChild(cardCompleted);
    container.appendChild(statsSummary);

    // 5. Days Grid Section
    const gridTitle = document.createElement('h2');
    gridTitle.className = 'days-grid-title';
    gridTitle.textContent = '내 단어장 목록';
    container.appendChild(gridTitle);

    const daysGrid = document.createElement('div');
    daysGrid.className = 'days-grid';

    allDays.forEach((dayNum, index) => {
      const dayData = dayDatas[index];
      const wordsPerDay = dayData ? (dayData.words ? dayData.words.length : 50) : 50;
      const dayCard = this.createDayCard(dayNum, progressData[String(dayNum)] || { mastered: [], starred: [] }, wordsPerDay);
      daysGrid.appendChild(dayCard);
    });
    
    container.appendChild(daysGrid);

    return container;
  }

  createStatCard(label, value, desc, onClick = null) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    if (onClick) {
      card.style.cursor = 'pointer';
      card.onclick = onClick;
      card.onmouseover = () => { card.style.borderColor = 'var(--accent-purple)'; card.style.transform = 'translateY(-2px)'; };
      card.onmouseout = () => { card.style.borderColor = 'var(--border-color)'; card.style.transform = 'none'; };
      card.style.transition = 'all 0.2s ease';
    }

    const lbl = document.createElement('div');
    lbl.className = 'stat-label';
    lbl.textContent = label;

    const val = document.createElement('div');
    val.className = 'stat-value';
    val.textContent = value;

    const description = document.createElement('div');
    description.style.fontSize = '12px';
    description.style.color = 'var(--text-muted)';
    description.style.marginTop = '4px';
    description.textContent = desc;

    card.appendChild(lbl);
    card.appendChild(val);
    card.appendChild(description);
    return card;
  }

  createDayCard(dayNum, dayProgress, wordsPerDay) {
    const masteredCount = (dayProgress.mastered || []).length;
    const progressPercent = Math.min(100, Math.round((masteredCount / wordsPerDay) * 100));

    const card = document.createElement('div');
    card.className = 'day-card';
    if (progressPercent === 100) {
      card.classList.add('completed');
    }

    const num = document.createElement('div');
    num.className = 'day-number';
    num.textContent = `Day ${String(dayNum).padStart(2, '0')}`;
    card.appendChild(num);

    // Progress Bar
    const progTrack = document.createElement('div');
    progTrack.className = 'day-progress';
    const progBar = document.createElement('div');
    progBar.className = 'day-progress-bar';
    progBar.style.width = `${progressPercent}%`;
    progTrack.appendChild(progBar);
    card.appendChild(progTrack);

    // Mastery status label
    const label = document.createElement('div');
    label.className = 'day-stat-label';
    label.textContent = `${masteredCount} / ${wordsPerDay} 완료`;
    card.appendChild(label);

    // Navigation Sub-Buttons (Study, Words, Quiz)
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.width = '100%';
    btnGroup.style.gap = '4px';
    btnGroup.style.marginTop = '12px';
    
    const studyLink = document.createElement('a');
    studyLink.className = 'mode-tab';
    studyLink.style.textAlign = 'center';
    studyLink.style.flex = '1';
    studyLink.style.padding = '6px 2px';
    studyLink.style.fontSize = '11px';
    studyLink.href = `#/study?day=${dayNum}`;
    studyLink.textContent = '카드학습';
    studyLink.onclick = (e) => e.stopPropagation();

    const listLink = document.createElement('a');
    listLink.className = 'mode-tab';
    listLink.style.textAlign = 'center';
    listLink.style.flex = '1';
    listLink.style.padding = '6px 2px';
    listLink.style.fontSize = '11px';
    listLink.href = `#/words?day=${dayNum}`;
    listLink.textContent = '단어장';
    listLink.onclick = (e) => e.stopPropagation();

    const quizLink = document.createElement('a');
    quizLink.className = 'mode-tab';
    quizLink.style.textAlign = 'center';
    quizLink.style.flex = '1';
    quizLink.style.padding = '6px 2px';
    quizLink.style.fontSize = '11px';
    quizLink.href = `#/quiz?day=${dayNum}`;
    quizLink.textContent = '테스트';
    quizLink.onclick = (e) => e.stopPropagation();

    btnGroup.appendChild(studyLink);
    btnGroup.appendChild(listLink);
    btnGroup.appendChild(quizLink);
    card.appendChild(btnGroup);

    // Card click defaults to Study View
    card.addEventListener('click', () => {
      window.location.hash = `#/study?day=${dayNum}`;
    });

    return card;
  }

  destroy() {
    // No active listeners to release on dashboard
  }
}

export default DashboardView;
