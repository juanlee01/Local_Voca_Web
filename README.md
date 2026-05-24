<p align="center">
  <strong style="font-size: 36px;">VocaFlow</strong>
</p>

<p align="center">
  <em>🌐 인터넷 연결 없이도 작동하는, 나만의 로컬 영단어 학습 도구</em>
</p>

<p align="center">
  <a href="https://juanlee01.github.io/Local_Voca_Web/">🔗 Live Demo (GitHub Pages)</a>
</p>

---

## 소개

**VocaFlow**는 백엔드 서버 없이 **브라우저만으로 완전히 동작**하는 Local-First 영어 단어 학습 웹 애플리케이션입니다.

사용자의 모든 학습 데이터(진도, 중요 단어, 설정)는 브라우저의 `localStorage`와 `IndexedDB`에 저장되며, 외부 서버로 전송되지 않습니다. JSON 파일 기반으로 단어장을 관리하고, PWA(Progressive Web App)를 지원하여 오프라인에서도 학습할 수 있습니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
|  **플래시카드 학습** | 3D 플립 애니메이션 카드로 단어/뜻 학습. 키보드 단축키(←, →, Space) 지원 |
|  **4지선다 퀴즈** | 10문제 랜덤 선다형 테스트. 오답 리뷰 기능 포함 |
|  **단어장 브라우저** | 전체/미암기/중요 단어 필터링, 뜻 가리기 모드, 인라인 검색 |
|  **글로벌 검색** | IndexedDB 기반 전체 단어장 실시간 검색 (디바운싱 적용) |
|  **TTS 발음 재생** | Web Speech API 기반 영어 발음. 속도/톤 커스터마이징 가능 |
|  **중요 단어 북마크** | 단어별 즐겨찾기(별표) 기능. 중요 단어만 필터링 학습 가능 |
|  **암기 진도 추적** | 단어별 mastered 상태 관리. 대시보드에서 Day별 진도율 시각화 |
|  **학습 대시보드** | 전체 진도 통계, 최근/다음 학습 Day 바로가기, Day별 카드 그리드 |
|  **JSON 임포트** | 커스텀 단어장 JSON 파일 업로드. 복수 파일 동시 임포트 지원 |
| **백업 & 복원** | 학습 진도를 JSON 파일로 내보내기/가져오기 |
|  **다크/라이트 테마** | 시스템 테마와 독립적으로 전환 가능한 다크 모드 |
|  **모바일 최적화** | 모바일 퍼스트 반응형 UI. 하단 네비게이션 바, 44px 터치 타겟 |
|  **오프라인 지원 (PWA)** | Service Worker 캐시를 통한 완전한 오프라인 학습 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | Vanilla HTML5 + CSS3 + JavaScript (ES Modules) |
| **데이터 저장소** | IndexedDB (단어 데이터), localStorage (사용자 설정 & 진도) |
| **오프라인** | Service Worker (Cache-First + Stale-While-Revalidate) |
| **PWA** | Web App Manifest, Standalone 모드 |
| **TTS** | Web Speech Synthesis API |
| **폰트** | Inter, Outfit (self-hosted woff2) |
| **라우팅** | Hash-based SPA Router (`#/study?day=1`) |
| **호스팅** | GitHub Pages (완전 정적 배포) |
| **빌드 도구** | 없음 — 번들러/트랜스파일러 없이 순수 브라우저 모듈 사용 |

---

## 프로젝트 구조

```
Local_Voca_Web/
├── index.html              # SPA 진입점 (앱 셸, 헤더, 네비게이션)
├── index.css               # 전체 디자인 시스템 (다크/라이트 테마, 컴포넌트)
├── manifest.json           # PWA 웹 앱 매니페스트
├── sw.js                   # Service Worker (오프라인 캐시 엔진)
├── RULES.md                # 프로젝트 개발 규칙 문서
├── .gitignore
│
├── fonts/                  # 자체 호스팅 웹 폰트
│   ├── inter-400.woff2
│   ├── inter-700.woff2
│   ├── outfit-400.woff2
│   └── outfit-700.woff2
│
└── js/                     # JavaScript 모듈
    ├── app.js              # 앱 부트스트래퍼 & 글로벌 컨트롤러
    ├── router.js           # Hash 기반 SPA 라우터 & 뷰 라이프사이클
    ├── state.js            # 상태 관리자 (localStorage, Pub/Sub 패턴)
    ├── db.js               # IndexedDB 매니저 (검색 인덱서, CRUD)
    ├── tts.js              # Text-to-Speech 엔진
    │
    └── views/              # 페이지 뷰 컴포넌트 (동적 로드)
        ├── dashboard.js    # 대시보드 (진도 통계, Day 그리드)
        ├── study.js        # 플래시카드 학습 뷰
        ├── quiz.js         # 4지선다 퀴즈 뷰
        ├── words.js        # 단어장 브라우저 뷰
        ├── search.js       # 글로벌 검색 뷰
        └── settings.js     # 설정 & 데이터 관리 뷰
```

---

## 시작하기

### 사전 요구사항

- 모던 웹 브라우저 (Chrome, Safari, Firefox, Edge)
- 로컬 개발 서버 (ES Modules는 `file://` 프로토콜에서 동작하지 않음)

### 로컬 실행

```bash
# 1. 저장소 클론
git clone https://github.com/juanlee01/Local_Voca_Web.git
cd Local_Voca_Web

# 2. 로컬 서버 실행 (아래 중 택 1)

# Python 3
python3 -m http.server 6003

# Node.js (npx)
npx serve -l 6003

# VS Code Live Server 확장 사용
# (확장 설치 후 index.html 우클릭 → Open with Live Server)
```

브라우저에서 `http://localhost:6003` 접속

### 단어장 데이터 추가

앱 실행 후 **설정 → 내 단어장 추가 및 관리** 메뉴에서 JSON 파일을 업로드합니다.

---

## 단어장 JSON 형식

단어장 파일은 아래 스키마를 따라야 합니다:

```json
{
  "day": 1,
  "words": [
    {
      "id": 1,
      "word": "abandon",
      "meaning": "버리다, 포기하다"
    },
    {
      "id": 2,
      "word": "abundant",
      "meaning": "풍부한, 많은"
    }
  ]
}
```

### 필수 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `day` | `number` | Day 번호 (고유 식별자) |
| `words` | `array` | 단어 배열 |
| `words[].id` | `number` | 단어 고유 ID (Day 내에서 유일) |
| `words[].word` | `string` | 영어 단어 |
| `words[].meaning` | `string` | 한국어 뜻 |

> **참고:** 동일한 Day 번호의 파일을 다시 업로드하면 기존 데이터가 덮어쓰기됩니다.

---

## 아키텍처

### 데이터 흐름

```
┌─────────────────────────────────────────────────────┐
│  User Interaction (Browser)                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  index.html  ──→  app.js (Bootstrap)                │
│                     │                               │
│                     ├── state.js ←→ localStorage    │
│                     │   (설정, 진도, Pub/Sub)        │
│                     │                               │
│                     ├── db.js ←→ IndexedDB          │
│                     │   (단어 데이터, 검색 인덱스)    │
│                     │                               │
│                     ├── router.js                    │
│                     │   (Hash 라우팅, 뷰 라이프사이클) │
│                     │                               │
│                     └── tts.js                       │
│                         (Web Speech API)             │
│                                                     │
│  views/  ← 동적 import()로 필요 시 로드             │
│    dashboard.js │ study.js │ quiz.js                 │
│    words.js │ search.js │ settings.js                │
│                                                     │
│  sw.js  (Service Worker - 오프라인 캐시)             │
└─────────────────────────────────────────────────────┘
```

### 핵심 설계 원칙

- **Local-First**: 모든 사용자 데이터는 브라우저 내부에 저장. 서버 불필요.
- **Zero Build**: 번들러 없이 네이티브 ES Modules 사용. 배포 즉시 실행 가능.
- **Safe DOM**: `innerHTML` 사용 금지. 모든 DOM은 `createElement` + `textContent`로 안전하게 생성.
- **Lazy Loading**: 뷰 컴포넌트는 `import()`를 통해 필요할 때만 동적 로드.
- **Pub/Sub State**: `StateManager`가 `subscribe/notify` 패턴으로 반응형 상태 변경 전파.

---

## 📱 페이지 라우팅

| 라우트 | 뷰 | 설명 |
|--------|-----|------|
| `#/` | Dashboard | 학습 대시보드, 진도 통계, Day 그리드 |
| `#/study?day=N` | Study | Day N 플래시카드 학습 |
| `#/words?day=N` | Words | Day N 단어장 목록 |
| `#/quiz?day=N` | Quiz | Day N 4지선다 퀴즈 |
| `#/search` | Search | 전체 단어 글로벌 검색 |
| `#/settings` | Settings | 앱 설정, 단어장 관리, 백업 |

---

## 키보드 단축키

| 키 | 동작 (학습 화면) |
|-----|-----------------|
| `Space` | 카드 뒤집기 (뜻 확인) |
| `←` 방향키 | 학습 필요 (다음 카드) |
| `→` 방향키 | 알아요 (암기 완료 처리) |

---

## 🌐 배포 (GitHub Pages)

이 프로젝트는 빌드 과정 없이 GitHub Pages에 바로 배포할 수 있습니다.

1. GitHub 저장소의 **Settings → Pages**로 이동
2. Source를 `Deploy from a branch` 선택
3. Branch를 `main` / `/ (root)` 로 설정
4. Save 클릭 후 수 분 내 배포 완료

> **주의:** 모든 경로는 상대 경로(`./`)를 사용해야 GitHub Pages 서브디렉토리에서도 정상 동작합니다.

---

## 보안 & 프라이버시

- **데이터 로컬 보관**: 모든 사용자 데이터는 브라우저에만 저장되며, 외부 서버로 전송하지 않음
- **JSON 검증**: 임포트 시 스키마 검증을 수행하여 잘못된 데이터 거부
- **Safe DOM 렌더링**: `innerHTML` 미사용으로 XSS 공격 원천 차단
- **임포트 데이터 새니타이징**: 설정/진도 복원 시 타입 및 범위 검증 수행
- **No Analytics**: 사용자 동의 없이 분석 데이터를 수집하지 않음

---

## 개발 규칙

프로젝트의 코드 품질과 일관성을 유지하기 위한 상세 개발 규칙은 [`RULES.md`](./RULES.md)를 참조하세요.

주요 원칙:
- 모바일 퍼스트 반응형 디자인
- CSS Custom Properties 기반 디자인 토큰
- 최소 44px × 44px 터치 타겟
- `rem` 단위 사용 (하드코딩된 `px` 지양)
- 외부 의존성 최소화 (Vanilla JS 우선)

---

## 로드맵

- [ ] 스페이스드 리피티션 (간격 반복) 알고리즘 적용
- [ ] 단어장 내보내기 (JSON 다운로드)
- [ ] 단어장 직접 편집 기능 (앱 내 단어 추가/수정/삭제)
- [ ] 학습 히스토리 / 통계 차트
- [ ] 다국어 인터페이스 지원 (영어 UI)
- [ ] PWA 앱 아이콘 추가

---

## 라이선스

이 프로젝트는 개인 학습 목적으로 제작되었습니다.

---

<p align="center">
 by <a href="https://github.com/juanlee01">juanlee01</a>
</p>
