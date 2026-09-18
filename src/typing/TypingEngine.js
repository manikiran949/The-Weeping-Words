/**
 * TypingEngine.js
 * Manages the core typing mechanic for the incantation.
 * Strict mode: wrong keystrokes halt progress until backspaced.
 *
 * Single-line mode: the text is split into short lines and only the
 * current line is rendered.  When the user finishes a line the next
 * one replaces it so the user's gaze stays fixed in one position.
 */

export class TypingEngine {
  /**
   * @param {string} text – full incantation
   * @param {number} [maxLineLength=45] – soft limit for line length (wraps on word boundary)
   */
  constructor(text, maxLineLength = 45) {
    this.fullText = text;
    this.lines = TypingEngine._splitIntoLines(text, maxLineLength);

    // Current position within the **full** text
    this.currentIndex = 0;
    this.errorIndex = -1; // -1 = no error

    // Which line the player is on
    this.currentLine = 0;

    // Pre-compute cumulative character offsets for each line
    // lineOffsets[i] = index in fullText where line i starts
    this.lineOffsets = [];
    let offset = 0;
    for (const line of this.lines) {
      this.lineOffsets.push(offset);
      offset += line.length;
    }

    // Callbacks
    this.onCorrect = null;
    this.onError = null;
    this.onBackspace = null;
    this.onComplete = null;
    this.onUpdate = null;   // Fired whenever state changes to update UI
    this.onLineChange = null; // Fired when we advance to the next line

    this.isActive = false;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  /* ─── Lifecycle ─────────────────────────────────────────────────── */

  start() {
    this.currentIndex = 0;
    this.errorIndex = -1;
    this.currentLine = 0;
    this.isActive = true;
    window.addEventListener('keydown', this.boundHandleKeyDown);
    if (this.onUpdate) this.onUpdate();
  }

  stop() {
    this.isActive = false;
    window.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  /* ─── Input ─────────────────────────────────────────────────────── */

  handleKeyDown(e) {
    if (!this.isActive) return;

    // Ignore modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      return;
    }

    // Prevent default scrolling for Space
    if (e.key === ' ') {
      e.preventDefault();
    }

    if (e.key === 'Backspace') {
      if (this.errorIndex !== -1) {
        this.errorIndex = -1;
        if (this.onBackspace) this.onBackspace();
        if (this.onUpdate) this.onUpdate();
      }
      return;
    }

    // If there's an active error, ignore all input except backspace
    if (this.errorIndex !== -1) {
      if (this.onError) this.onError(true);
      return;
    }

    // Check if correct key
    const expectedChar = this.fullText[this.currentIndex];

    if (e.key === expectedChar) {
      this.currentIndex++;
      if (this.onCorrect) this.onCorrect();

      // Did we just finish the entire text?
      if (this.currentIndex >= this.fullText.length) {
        this.stop();
        if (this.onComplete) this.onComplete();
      } else {
        // Did we cross into the next line?
        this._maybeAdvanceLine();
      }
    } else {
      this.errorIndex = this.currentIndex;
      if (this.onError) this.onError(false);
    }

    if (this.onUpdate) this.onUpdate();
  }

  /* ─── Line Management ───────────────────────────────────────────── */

  /** Advance `this.currentLine` when the cursor passes the line boundary. */
  _maybeAdvanceLine() {
    const nextLine = this.currentLine + 1;
    if (nextLine < this.lines.length && this.currentIndex >= this.lineOffsets[nextLine]) {
      this.currentLine = nextLine;
      if (this.onLineChange) this.onLineChange(this.currentLine, this.lines.length);
    }
  }

  /* ─── Rendering ─────────────────────────────────────────────────── */

  /**
   * Returns HTML for **only the current line**.
   * Each character is wrapped in a <span> with one of the classes:
   *   correct | error | current | pending
   */
  getHTML() {
    const line = this.lines[this.currentLine] ?? '';
    const lineStart = this.lineOffsets[this.currentLine] ?? 0;

    let html = '';
    for (let i = 0; i < line.length; i++) {
      const globalIdx = lineStart + i;
      const char = line[i];
      let className = 'pending';

      if (globalIdx < this.currentIndex && this.errorIndex !== globalIdx) {
        className = 'correct';
      } else if (globalIdx === this.errorIndex) {
        className = 'error';
      } else if (globalIdx === this.currentIndex && this.errorIndex === -1) {
        className = 'current';
      }

      const displayChar = char === ' ' ? '&nbsp;' : char;
      html += `<span class="${className}">${displayChar}</span>`;
    }
    return html;
  }

  /**
   * Returns a progress fraction (0 → 1) for the overall incantation.
   */
  getProgress() {
    return this.fullText.length === 0 ? 1 : this.currentIndex / this.fullText.length;
  }

  /**
   * Returns the 1-based "line N of M" label.
   */
  getLineLabel() {
    return `${this.currentLine + 1} / ${this.lines.length}`;
  }

  /* ─── Utilities ─────────────────────────────────────────────────── */

  /**
   * Splits `text` into lines no longer than `max` characters,
   * breaking on word boundaries where possible.
   */
  static _splitIntoLines(text, max) {
    const words = text.split(' ');
    const lines = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > max && current) {
        lines.push(current + ' '); // trailing space belongs to this line
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
