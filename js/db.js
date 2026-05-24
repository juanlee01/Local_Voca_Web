/* ==========================================================================
   VocaFlow - IndexedDB Local Search Indexer & Data Store
   ========================================================================== */

const DB_NAME = 'VocaFlowDB';
const DB_VERSION = 2; // Upgraded to v2 for custom days
const WORDS_STORE = 'words';
const DAYS_STORE = 'days';

class IndexDBManager {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
  }

  /**
   * Initialize IndexedDB database and object stores.
   */
  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Create words store if not exists
        if (!db.objectStoreNames.contains(WORDS_STORE)) {
          const store = db.createObjectStore(WORDS_STORE, { keyPath: 'key' });
          store.createIndex('word', 'word', { unique: false });
          store.createIndex('meaning', 'meaning', { unique: false });
          store.createIndex('day', 'day', { unique: false });
        }
        // Create days store if not exists
        if (!db.objectStoreNames.contains(DAYS_STORE)) {
          db.createObjectStore(DAYS_STORE, { keyPath: 'day' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB initialization failed:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Save a vocabulary JSON object to the days store.
   * Also indexes the words into the words store.
   */
  async saveDay(data) {
    await this.initPromise;

    // Strict Schema Validation
    if (!data || typeof data !== 'object') throw new Error('올바른 JSON 데이터가 아닙니다.');
    if (data.day === undefined || data.day === null) throw new Error('JSON 파일에 "day" 항목이 없습니다.');
    if (!Array.isArray(data.words)) throw new Error('JSON 파일에 "words" 배열이 없습니다.');

    const dayNum = data.day;

    for (const w of data.words) {
      if (w.id === undefined || w.word === undefined || w.meaning === undefined) {
        throw new Error('단어 형식에 id, word, meaning이 모두 포함되어야 합니다.');
      }
    }

    return new Promise((resolve, reject) => {
      // Transaction covering both stores
      const transaction = this.db.transaction([DAYS_STORE, WORDS_STORE], 'readwrite');
      const daysStore = transaction.objectStore(DAYS_STORE);
      const wordsStore = transaction.objectStore(WORDS_STORE);

      // 1. Delete existing words for this day from wordsStore
      const index = wordsStore.index('day');
      const request = index.openCursor(IDBKeyRange.only(dayNum));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          // After deleting old index, add the new day
          daysStore.put(data);

          // Add words to index
          for (const wordObj of data.words) {
            const doc = {
              key: `${dayNum}_${wordObj.id}`,
              day: dayNum,
              id: wordObj.id,
              word: String(wordObj.word).trim(),
              meaning: String(wordObj.meaning).trim()
            };
            wordsStore.put(doc);
          }
        }
      };

      request.onerror = (e) => reject(e.target.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Delete a day and its words index.
   */
  async deleteDay(dayNum) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DAYS_STORE, WORDS_STORE], 'readwrite');
      const daysStore = transaction.objectStore(DAYS_STORE);
      const wordsStore = transaction.objectStore(WORDS_STORE);

      daysStore.delete(dayNum);

      const index = wordsStore.index('day');
      const request = index.openCursor(IDBKeyRange.only(dayNum));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      request.onerror = (e) => reject(e.target.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get specific day data.
   */
  async getDayData(dayNum) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DAYS_STORE], 'readonly');
      const store = transaction.objectStore(DAYS_STORE);
      // Ensure dayNum matches type. usually dayNum might be a number or a string.
      // let's try getting it as-is first.
      const request = store.get(dayNum);

      request.onsuccess = (e) => resolve(e.target.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get all available days.
   */
  async getAllDays() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DAYS_STORE], 'readonly');
      const store = transaction.objectStore(DAYS_STORE);
      const request = store.getAllKeys();

      request.onsuccess = (e) => {
        // Return sorted keys
        const keys = e.target.result || [];
        keys.sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b));
        });
        resolve(keys);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Search query matching.
   * Scans words and meanings locally in IndexedDB.
   */
  async search(query) {
    await this.initPromise;
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([WORDS_STORE], 'readonly');
      const store = transaction.objectStore(WORDS_STORE);
      const results = [];

      // Open a cursor to scan records
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const val = cursor.value;
          const wordMatch = val.word.toLowerCase().includes(cleanQuery);
          const meaningMatch = val.meaning.toLowerCase().includes(cleanQuery);

          if (wordMatch || meaningMatch) {
            results.push(val);
          }

          // Limit to max 50 search results for performance
          if (results.length >= 50) {
            resolve(results);
            return;
          }

          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = (event) => {
        console.error('Search query cursor error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Force full re-indexing (e.g. if database is updated or corrupted).
   */
  async forceReindex() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([WORDS_STORE, DAYS_STORE], 'readwrite');
      transaction.objectStore(WORDS_STORE).clear();
      transaction.objectStore(DAYS_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  }
}

export const dbManager = new IndexDBManager();
