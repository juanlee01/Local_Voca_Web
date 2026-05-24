/* ==========================================================================
   VocaFlow - Settings & Backup View (Programmatic, zero innerHTML)
   ========================================================================== */

import { stateManager } from '../state.js';
import { ttsEngine } from '../tts.js';
import { showToast } from '../app.js';
import { dbManager } from '../db.js';

class SettingsView {
  constructor(params) {
    this.params = params;
    this.container = null;
  }

  /**
   * Render view DOM.
   */
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'settings-view-container';

    // Title
    const h1 = document.createElement('h1');
    h1.style.fontFamily = 'Outfit, sans-serif';
    h1.style.fontSize = '32px';
    h1.style.fontWeight = '700';
    h1.style.marginBottom = '32px';
    h1.textContent = '설정';
    this.container.appendChild(h1);

    // Section 1: UI Settings
    const uiCard = this.createSectionCard('화면 및 학습 설정');

    // 1. Dark Mode
    const rowTheme = this.createSettingRow(
      '다크 테마 사용',
      '화면을 어둡고 눈이 편안한 색상으로 전환합니다.',
      this.createToggleSwitch(stateManager.getTheme() === 'dark', (checked) => {
        stateManager.setTheme(checked ? 'dark' : 'light');
        showToast(checked ? '다크 모드가 켜졌습니다.' : '라이트 모드가 켜졌습니다.', 'info');
      })
    );
    uiCard.appendChild(rowTheme);

    // 2. Default blur meanings
    const rowBlur = this.createSettingRow(
      '단어 뜻 기본 가리기',
      '단어장에 들어갔을 때 뜻을 기본적으로 가려 흐리게 표시합니다.',
      this.createToggleSwitch(stateManager.getBlurMeanings(), (checked) => {
        stateManager.setBlurMeanings(checked);
      })
    );
    uiCard.appendChild(rowBlur);

    // 3. Auto Play Words TTS
    const rowAutoPlay = this.createSettingRow(
      '단어 자동 발음 재생',
      '카드 학습 시 다음 단어로 전환하면 발음을 자동으로 재생합니다.',
      this.createToggleSwitch(stateManager.getAutoPlayTts(), (checked) => {
        stateManager.setAutoPlayTts(checked);
      })
    );
    uiCard.appendChild(rowAutoPlay);

    this.container.appendChild(uiCard);

    // Section 2: TTS Settings
    const ttsCard = this.createSectionCard('발음 음성(TTS) 설정');

    // 1. Voice speed rate
    const rateSlider = this.createRangeSlider(0.5, 2.0, 0.1, stateManager.getTtsRate(), (val) => {
      stateManager.setTtsRate(val);
    });
    const rowSpeed = this.createSettingRow(
      '음성 속도',
      '단어 발음 재생 속도를 조절합니다 (0.5x ~ 2.0x).',
      rateSlider
    );
    ttsCard.appendChild(rowSpeed);

    // 2. Pitch
    const pitchSlider = this.createRangeSlider(0.5, 2.0, 0.1, stateManager.getTtsPitch(), (val) => {
      stateManager.setTtsPitch(val);
    });
    const rowPitch = this.createSettingRow(
      '음성 톤 (Pitch)',
      '단어 발음 목소리의 높낮이를 조절합니다.',
      pitchSlider
    );
    ttsCard.appendChild(rowPitch);

    // 3. TTS Test Speech button
    const testRow = document.createElement('div');
    testRow.className = 'setting-row';
    testRow.style.marginTop = '16px';
    testRow.style.justifyContent = 'flex-end';
    
    const testBtn = document.createElement('button');
    testBtn.className = 'settings-btn btn-secondary';
    testBtn.style.width = 'auto';
    testBtn.textContent = '발음 테스트 재생';
    testBtn.onclick = () => {
      ttsEngine.speak('VocaFlow helps you master vocabulary.');
    };
    testRow.appendChild(testBtn);
    ttsCard.appendChild(testRow);

    this.container.appendChild(ttsCard);

    // Section 3: Data Management (Backup, Restore, Clear)
    const dataCard = this.createSectionCard('진도 백업 및 초기화');

    const descRow = document.createElement('div');
    descRow.style.fontSize = '14px';
    descRow.style.color = 'var(--text-secondary)';
    descRow.style.marginBottom = '24px';
    descRow.textContent = '브라우저 저장소가 정리될 때 학습 진도가 손실되지 않도록 정기적으로 진도 백업 파일을 보관하는 것을 권장합니다.';
    dataCard.appendChild(descRow);

    // Button group
    const btnGroup = document.createElement('div');
    btnGroup.className = 'backup-btn-grid';

    // Export Button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'settings-btn btn-secondary';
    exportBtn.textContent = '진도 백업 내보내기';
    exportBtn.onclick = () => this.handleExport();
    btnGroup.appendChild(exportBtn);

    // Import Button Wrapper
    const importWrapper = document.createElement('div');
    importWrapper.className = 'file-upload-wrapper';
    
    const importBtn = document.createElement('button');
    importBtn.className = 'settings-btn btn-secondary';
    importBtn.style.width = '100%';
    importBtn.textContent = '진도 백업 가져오기';
    importWrapper.appendChild(importBtn);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => this.handleImport(e);
    importWrapper.appendChild(fileInput);
    btnGroup.appendChild(importWrapper);

    // Clear Progress Button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'settings-btn btn-secondary';
    clearBtn.style.color = 'var(--accent-red)';
    clearBtn.style.borderColor = 'var(--accent-red)';
    clearBtn.textContent = '모든 진도 및 DB 초기화';
    clearBtn.onclick = () => {
      this.showConfirmModal(
        '정말로 초기화하시겠습니까?',
        '초기화 시 지금까지 기록된 단어 암기 상태와 중요 단어 북마크, 그리고 등록된 단어장 데이터가 모두 지워지며, 복구할 수 없습니다.',
        '초기화 실행',
        () => {
          localStorage.clear();
          dbManager.forceReindex();
          showToast('모든 데이터가 완전히 초기화되었습니다.', 'success');
          setTimeout(() => window.location.hash = '#/', 1000);
        }
      );
    };
    btnGroup.appendChild(clearBtn);

    dataCard.appendChild(btnGroup);
    this.container.appendChild(dataCard);


    // Section 4: Vocabulary Data Management (JSON Import/Delete)
    const vocabCard = this.createSectionCard('내 단어장 추가 및 관리');
    
    const vocabDesc = document.createElement('div');
    vocabDesc.style.fontSize = '14px';
    vocabDesc.style.color = 'var(--text-secondary)';
    vocabDesc.style.marginBottom = '24px';
    vocabDesc.textContent = '직접 만든 단어장(JSON 파일)을 앱에 추가하여 학습할 수 있습니다. 이미 존재하는 Day 번호의 파일을 업로드하면 덮어쓰기 처리됩니다.';
    vocabCard.appendChild(vocabDesc);

    // Import Vocabulary Button
    const vocabImportWrapper = document.createElement('div');
    vocabImportWrapper.className = 'file-upload-wrapper';
    vocabImportWrapper.style.marginBottom = '24px';

    const vocabImportBtn = document.createElement('button');
    vocabImportBtn.className = 'settings-btn';
    vocabImportBtn.style.width = '100%';
    vocabImportBtn.style.background = 'var(--accent-purple)';
    vocabImportBtn.style.borderColor = 'var(--accent-purple)';
    vocabImportBtn.style.color = '#fff';
    vocabImportBtn.textContent = '새 JSON 단어장 업로드 (+)';
    vocabImportWrapper.appendChild(vocabImportBtn);

    const vocabFileInput = document.createElement('input');
    vocabFileInput.type = 'file';
    vocabFileInput.accept = '.json';
    vocabFileInput.multiple = true;
    vocabFileInput.onchange = (e) => this.handleVocabImport(e);
    vocabImportWrapper.appendChild(vocabFileInput);
    vocabCard.appendChild(vocabImportWrapper);

    // List of uploaded days
    const listTitle = document.createElement('h4');
    listTitle.textContent = '현재 등록된 단어장';
    listTitle.style.marginBottom = '12px';
    vocabCard.appendChild(listTitle);

    const daysListContainer = document.createElement('div');
    daysListContainer.className = 'days-list-container';
    daysListContainer.style.display = 'flex';
    daysListContainer.style.flexDirection = 'column';
    daysListContainer.style.gap = '8px';
    vocabCard.appendChild(daysListContainer);

    // Fetch and render list
    dbManager.getAllDays().then(days => {
      if (days.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.style.fontSize = '14px';
        empty.style.textAlign = 'center';
        empty.style.padding = '16px';
        empty.style.border = '1px dashed var(--border-color)';
        empty.style.borderRadius = 'var(--border-radius-md)';
        empty.textContent = '등록된 단어장이 없습니다.';
        daysListContainer.appendChild(empty);
      } else {
        days.forEach(dayNum => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';
          row.style.padding = '12px 16px';
          row.style.background = 'var(--bg-card)';
          row.style.borderRadius = 'var(--border-radius-sm)';
          row.style.border = '1px solid var(--border-color)';

          const title = document.createElement('span');
          title.textContent = `Day ${dayNum}`;
          title.style.fontWeight = '600';
          
          const delBtn = document.createElement('button');
          delBtn.className = 'action-btn';
          delBtn.style.color = 'var(--accent-red)';
          delBtn.style.borderColor = 'transparent';
          delBtn.style.padding = '4px 8px';
          delBtn.style.width = 'auto';
          delBtn.style.fontSize = '12px';
          delBtn.textContent = '삭제';
          delBtn.onclick = () => {
            this.showConfirmModal(
              '단어장 삭제',
              `정말로 Day ${dayNum} 단어장을 삭제하시겠습니까?`,
              '삭제 실행',
              async () => {
                try {
                  await dbManager.deleteDay(dayNum);
                  showToast(`Day ${dayNum} 삭제 완료`, 'success');
                  row.remove();
                  if (daysListContainer.children.length === 0) {
                    const empty = document.createElement('div');
                    empty.style.color = 'var(--text-muted)';
                    empty.style.fontSize = '14px';
                    empty.style.textAlign = 'center';
                    empty.style.padding = '16px';
                    empty.style.border = '1px dashed var(--border-color)';
                    empty.style.borderRadius = 'var(--border-radius-md)';
                    empty.textContent = '등록된 단어장이 없습니다.';
                    daysListContainer.appendChild(empty);
                  }
                } catch (e) {
                  showToast('삭제 실패', 'error');
                }
              }
            );
          };

          row.appendChild(title);
          row.appendChild(delBtn);
          daysListContainer.appendChild(row);
        });
      }
    });

    this.container.appendChild(vocabCard);

    return this.container;
  }

  createSectionCard(title) {
    const card = document.createElement('div');
    card.className = 'settings-section-card';
    const t = document.createElement('div');
    t.className = 'settings-section-title';
    t.textContent = title;
    card.appendChild(t);
    return card;
  }

  createSettingRow(label, desc, controlElement) {
    const row = document.createElement('div');
    row.className = 'setting-row';

    const textBlock = document.createElement('div');
    textBlock.className = 'setting-label-block';

    const lbl = document.createElement('div');
    lbl.className = 'setting-label';
    lbl.textContent = label;

    const d = document.createElement('div');
    d.className = 'setting-desc';
    d.textContent = desc;

    textBlock.appendChild(lbl);
    textBlock.appendChild(d);
    row.appendChild(textBlock);

    row.appendChild(controlElement);
    return row;
  }

  createToggleSwitch(isActive, onChange) {
    const label = document.createElement('label');
    label.className = 'switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isActive;
    input.onchange = (e) => onChange(e.target.checked);

    const slider = document.createElement('span');
    slider.className = 'slider';

    label.appendChild(input);
    label.appendChild(slider);
    return label;
  }

  createRangeSlider(min, max, step, currentVal, onChange) {
    const container = document.createElement('div');
    container.className = 'range-slider';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = currentVal;

    const valDisplay = document.createElement('span');
    valDisplay.className = 'range-val';
    valDisplay.textContent = `${currentVal}x`;

    input.oninput = (e) => {
      valDisplay.textContent = `${e.target.value}x`;
      onChange(parseFloat(e.target.value));
    };

    container.appendChild(input);
    container.appendChild(valDisplay);
    return container;
  }

  async handleVocabImport(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const readFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('파일 읽기 오류'));
        reader.readAsText(file);
      });
    };

    try {
      const allDays = await dbManager.getAllDays();
      const parsedFiles = [];
      let conflictCount = 0;

      for (let i = 0; i < files.length; i++) {
        try {
          const text = await readFile(files[i]);
          const data = JSON.parse(text);
          parsedFiles.push(data);
          if (allDays.includes(data.day)) {
            conflictCount++;
          }
        } catch (e) {
          showToast(`파일 파싱 오류: ${files[i].name}`, 'error');
        }
      }

      if (parsedFiles.length === 0) return;

      const proceedImport = async (overwrite) => {
        let success = 0;
        for (const data of parsedFiles) {
          if (allDays.includes(data.day) && !overwrite) continue;
          try {
            await dbManager.saveDay(data);
            success++;
          } catch(e) {
            console.error('Save failed:', e);
          }
        }
        if (success > 0) {
          showToast(`${success}개의 단어장이 성공적으로 추가/갱신되었습니다!`, 'success');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast('추가된 단어장이 없습니다.', 'info');
        }
      };

      if (conflictCount > 0) {
        this.showConfirmModal(
          '단어장 덮어쓰기',
          `업로드한 파일 중 ${conflictCount}개의 단어장이 이미 존재합니다. 기존 데이터를 덮어쓰시겠습니까? (취소 시 겹치지 않는 단어장만 추가됩니다)`,
          '덮어쓰기',
          () => proceedImport(true),
          () => proceedImport(false)
        );
      } else {
        proceedImport(true);
      }
    } catch (e) {
      showToast('처리 중 오류가 발생했습니다.', 'error');
    }
    
    // Reset file input so same files can be selected again
    event.target.value = '';
  }

  handleExport() {
    try {
      const dataStr = stateManager.exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `vocaflow_progress_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      showToast('백업 파일 다운로드가 시작되었습니다.', 'success');
    } catch (e) {
      console.error('Export failed:', e);
      showToast('백업 실패.', 'error');
    }
  }

  handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const res = stateManager.importData(text);

      if (res.success) {
        showToast('성공적으로 진도 백업 데이터를 가져왔습니다!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast(`복원에 실패했습니다: ${res.error || '잘못된 파일 양식입니다.'}`, 'error');
      }
    };
    reader.onerror = () => {
      showToast('파일 읽기 오류.', 'error');
    };
    reader.readAsText(file);
  }

  showConfirmModal(titleText, descText, confirmBtnText, onConfirm, onCancel = null) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '3000';

    const dialog = document.createElement('div');
    dialog.style.background = 'var(--bg-surface)';
    dialog.style.border = '1px solid var(--border-color)';
    dialog.style.borderRadius = 'var(--border-radius-md)';
    dialog.style.padding = '32px';
    dialog.style.maxWidth = '400px';
    dialog.style.width = '90%';
    dialog.style.textAlign = 'center';
    dialog.style.boxShadow = 'var(--shadow-lg)';

    const emoji = document.createElement('div');
    emoji.style.fontSize = '48px';
    emoji.style.marginBottom = '16px';
    emoji.textContent = '⚠️';
    dialog.appendChild(emoji);

    const title = document.createElement('h3');
    title.style.marginBottom = '12px';
    title.textContent = titleText;
    dialog.appendChild(title);

    const desc = document.createElement('p');
    desc.style.fontSize = '14px';
    desc.style.color = 'var(--text-secondary)';
    desc.style.lineHeight = '1.6';
    desc.style.marginBottom = '24px';
    desc.textContent = descText;
    dialog.appendChild(desc);

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '12px';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'settings-btn btn-secondary';
    cancelBtn.textContent = '취소';
    cancelBtn.onclick = () => {
      if (onCancel) onCancel();
      overlay.remove();
    };
    btnGroup.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'settings-btn';
    confirmBtn.style.background = 'var(--accent-red)';
    confirmBtn.style.color = '#fff';
    confirmBtn.style.border = 'none';
    confirmBtn.textContent = confirmBtnText;
    confirmBtn.onclick = () => {
      onConfirm();
      overlay.remove();
    };
    btnGroup.appendChild(confirmBtn);

    dialog.appendChild(btnGroup);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  destroy() {
    // No active listeners to release on settings
  }
}

export default SettingsView;
