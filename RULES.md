# Local-First Vocabulary Web App Rules

## Project Philosophy

This project is designed as a local-first static web application.

Core principles:

- No backend server
- No database server
- Fully deployable on GitHub Pages
- User data stays inside the browser
- JSON-based content management
- Lightweight architecture

---

# Tech Stack

## Core Stack

- HTML
- CSS
- Vanilla JavaScript

Optional:

- IndexedDB
- Service Worker (PWA)

Avoid unless necessary:

- Backend frameworks
- SSR
- Node.js server dependencies

---

# Deployment Rules

## Hosting Target

Primary deployment target:

- GitHub Pages

Requirements:

- Fully static deployment
- No server runtime
- No Prisma
- No backend API

---

# Data Architecture

## Static Default Data

Store default data as JSON files.

Example:

```txt
/data
  /vocabulary
    vocabulary_day01.json
    vocabulary_day02.json
```

Rules:

- JSON files are read-only assets
- Data must be fetchable by browser
- Split large datasets into smaller files

---

# User Data Storage

## Local-First Storage

User data must be stored locally.

Preferred order:

1. localStorage
2. IndexedDB

Examples:

- Study progress
- User vocabulary
- Settings
- Review history

Never require a backend server.

---

# JSON Import / Export

## Import Rules

Users can upload JSON files.

Requirements:

- Validate JSON structure
- Reject malformed files
- Prevent crashes

Example:

```json
{
  "day": 1,
  "words": [
    {
      "id": 1,
      "word": "apple",
      "meaning": "사과"
    }
  ]
}
```

---

## Export Rules

Users should be able to export:

- Vocabulary
- Study progress
- Settings

Preferred format:

- JSON

---

# Storage Rules

## localStorage Usage

Use for:

- UI state
- Theme settings
- Small datasets

Avoid extremely large storage.

---

## IndexedDB Usage

Use when:

- Dataset becomes large
- Offline cache grows
- Search indexing is needed

Recommended library:

- Dexie.js

---

# UI Architecture

## Rendering Rules

Preferred:

- createElement
- template literals
- event delegation

Avoid:

- Excessive innerHTML replacement
- Heavy rerendering

---

# Responsive UI Rules

## Mobile-First Design

Always design for mobile first, then scale up to larger screens.

```css
/* Mobile first: base styles target mobile */
.container { padding: 1rem; }

/* Scale up for larger screens */
@media (min-width: 768px) {
  .container { padding: 2rem; }
}
```

---

## Breakpoints

Use consistent breakpoints across all stylesheets:

| Name     | Min Width | Target Devices        |
|----------|-----------|-----------------------|
| mobile   | (default) | phones (< 480px)      |
| sm       | 480px     | large phones           |
| md       | 768px     | tablets                |
| lg       | 1024px    | laptops / desktops     |
| xl       | 1280px    | wide screens           |

Rules:

- Never hard-code pixel values for device detection in JS
- Use CSS media queries only — avoid `window.innerWidth` logic in JS
- Define breakpoints as CSS custom properties when possible

---

## Layout Rules

Preferred layout systems:

- CSS Flexbox for 1D layouts (rows, columns)
- CSS Grid for 2D layouts (card grids, page structure)

Rules:

- Avoid fixed widths on containers — use `max-width` with `width: 100%`
- Use `min-height` instead of `height` for flexible containers
- Prefer `gap` over margin hacks for spacing
- Use `clamp()` for fluid font sizes and spacing

Example:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
```

---

## Touch Target Rules

All interactive elements must be touch-friendly.

Requirements:

- Minimum tap target size: **44px × 44px** (Apple HIG standard)
- Minimum spacing between adjacent tap targets: **8px**
- Avoid hover-only interactions — use `:active` for mobile feedback

Example:

```css
.btn {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1.25rem;
}
```

---

## Typography Rules

Use fluid, readable typography across all screen sizes.

Rules:

- Base font size: minimum **16px** (prevents iOS auto-zoom on inputs)
- Use `rem` units, not `px`, for all font sizes
- Use `clamp()` for responsive headings

Example:

```css
:root {
  font-size: 16px;
}

h1 {
  font-size: clamp(1.5rem, 5vw, 2.5rem);
}

p {
  font-size: clamp(0.9rem, 2.5vw, 1rem);
  line-height: 1.6;
}
```

---

## Navigation Rules

Mobile navigation must be usable with one hand.

Rules:

- Use a bottom navigation bar on mobile (`position: fixed; bottom: 0`)
- Top navigation is acceptable on tablet and above
- Always provide a visible active state on current route
- Hamburger menus are allowed but not preferred — prefer bottom nav

Example structure:

```txt
Mobile:  [bottom nav bar with icons + labels]
Tablet+: [top nav bar or sidebar]
```

---

## Input & Form Rules

Mobile input must be seamless.

Rules:

- Always set correct `type` on inputs to trigger the right keyboard
  - `type="number"` for numbers
  - `type="search"` for search fields
  - `type="email"` for email
- Add `autocomplete` attributes where applicable
- Avoid tiny `<select>` dropdowns — prefer custom modal pickers on mobile
- Group related inputs with clear labels above (not inside) the field

---

## Scrolling Rules

Rules:

- Main content area must be scrollable without JS
- Use `-webkit-overflow-scrolling: touch` for smooth scroll on iOS (legacy)
- Avoid `overflow: hidden` on `body` unless showing a modal
- Modals must be scrollable internally if content is long
- Use `overscroll-behavior: contain` on modal/drawer scroll containers

---

## Spacing & Sizing Scale

Use a consistent spacing scale based on `rem`:

| Token  | Value  |
|--------|--------|
| `--sp-1` | 0.25rem |
| `--sp-2` | 0.5rem  |
| `--sp-3` | 0.75rem |
| `--sp-4` | 1rem    |
| `--sp-6` | 1.5rem  |
| `--sp-8` | 2rem    |
| `--sp-12`| 3rem    |
| `--sp-16`| 4rem    |

Rules:

- Define these as CSS custom properties in `:root`
- Do not use raw pixel values for padding/margin in components

---

## Viewport & Meta Rules

Every HTML page must include:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Never:

- Set `user-scalable=no` — it harms accessibility
- Set `maximum-scale=1` — it prevents zoom for users who need it

---

## Image & Asset Rules

Rules:

- Use `max-width: 100%` on all images
- Prefer SVG for icons and simple graphics (scales perfectly)
- Use `loading="lazy"` on non-critical images
- Provide `width` and `height` attributes to prevent layout shift

---

## Accessibility on Mobile

Rules:

- Maintain minimum contrast ratio of **4.5:1** for text
- All tap targets must be reachable via keyboard/screen reader
- Use `aria-label` on icon-only buttons
- Test with VoiceOver (iOS) or TalkBack (Android) where possible

---

# Routing Rules

Preferred:

- Hash routing
- Query parameter routing

Examples:

```txt
#/study
#/words
?day=1
```

---

# Offline Support

Optional but recommended:

- Service Worker
- Offline caching
- Installable PWA

---

# Performance Rules

Goals:

- Fast loading
- Small JS bundle
- Low memory usage

Avoid:

- Heavy dependencies
- Complex runtime systems

---

# Security Rules

Always validate imported JSON.

Never:

- Execute imported content
- Trust external files blindly

---

# Privacy Rules

User data must stay local.

Never:

- Upload automatically
- Send analytics without consent

---

# GitHub Pages Compatibility

Avoid absolute paths:

```js
fetch('/data/vocabulary_day01.json')
```

Prefer:

```js
fetch('./data/vocabulary_day01.json')
```

---

# Development Philosophy

Before adding a dependency:

1. Can this be done in Vanilla JS?
2. Is the dependency worth it?
3. Will it complicate deployment?

---

# Recommended Features

- Flashcards
- Vocabulary browsing
- Local search
- Offline mode
- JSON import/export

---

# Avoided Features

- Server login
- Multi-user sync
- Real-time collaboration
- Backend database