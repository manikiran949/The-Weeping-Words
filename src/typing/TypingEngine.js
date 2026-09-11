/**
 * TypingEngine.js
 * Manages the core typing mechanic for the incantation.
 * Strict mode: wrong keystrokes halt progress until backspaced.
 */

export class TypingEngine {
  constructor(text) {
    this.text = text;
    this.currentIndex = 0;
    this.errorIndex = -1; // -1 if no error, otherwise index of the error
    
    // Callbacks
    this.onCorrect = null;
    this.onError = null;
    this.onBackspace = null;
    this.onComplete = null;
    this.onUpdate = null; // Fired whenever state changes to update UI
    
    this.isActive = false;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  start() {
    this.currentIndex = 0;
    this.errorIndex = -1;
    this.isActive = true;
    window.addEventListener('keydown', this.boundHandleKeyDown);
    if (this.onUpdate) this.onUpdate();
  }

  stop() {
    this.isActive = false;
    window.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  handleKeyDown(e) {
    if (!this.isActive) return;

    // Ignore modifier keys
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'CapsLock' || e.key === 'Tab') {
      return;
    }

    // Prevent default scrolling for Space
    if (e.key === ' ') {
      e.preventDefault();
    }

    if (e.key === 'Backspace') {
      if (this.errorIndex !== -1) {
        // Clear the error
        this.errorIndex = -1;
        if (this.onBackspace) this.onBackspace();
        if (this.onUpdate) this.onUpdate();
      }
      return;
    }

    // If there's an active error, ignore all input except backspace
    if (this.errorIndex !== -1) {
      if (this.onError) this.onError(true); // Trigger buzz again
      return;
    }

    // Check if correct key
    const expectedChar = this.text[this.currentIndex];
    
    if (e.key === expectedChar) {
      this.currentIndex++;
      if (this.onCorrect) this.onCorrect();
      
      if (this.currentIndex >= this.text.length) {
        this.stop();
        if (this.onComplete) this.onComplete();
      }
    } else {
      // Wrong key
      this.errorIndex = this.currentIndex;
      if (this.onError) this.onError(false);
    }
    
    if (this.onUpdate) this.onUpdate();
  }

  /**
   * Generates HTML for the current text state.
   * Format:
   * <span class="correct">E</span>
   * <span class="error">x</span>
   * <span class="current">o</span>
   * <span class="pending">r</span>
   */
  getHTML() {
    let html = '';
    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i];
      let className = 'pending';
      
      if (i < this.currentIndex && this.errorIndex !== i) {
        className = 'correct';
      } else if (i === this.errorIndex) {
        className = 'error';
      } else if (i === this.currentIndex && this.errorIndex === -1) {
        className = 'current';
      }
      
      // Handle spaces so they are visible
      const displayChar = char === ' ' ? '&nbsp;' : char;
      html += `<span class="${className}">${displayChar}</span>`;
    }
    return html;
  }
}
