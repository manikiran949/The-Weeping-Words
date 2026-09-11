/**
 * UIManager.js
 * Handles DOM manipulation, screen transitions, and the Threat HUD.
 */

export class UIManager {
  constructor() {
    // Screens
    this.screens = {
      intro: document.getElementById('screen-intro'),
      setup: document.getElementById('screen-setup'),
      game: document.getElementById('screen-game'),
      win: document.getElementById('screen-win'),
      gameover: document.getElementById('screen-gameover')
    };

    // UI Elements
    this.btnGrantCamera = document.getElementById('btn-grant-camera');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnRestartWin = document.getElementById('btn-restart-win');
    this.btnRestartLose = document.getElementById('btn-restart-lose');
    
    this.setupStatus = document.getElementById('setup-status');
    this.typingContainer = document.getElementById('typing-container');
    this.threatMeterBar = document.getElementById('threat-meter-bar');
    
    // Webcam feed containers
    this.setupVideoContainer = document.getElementById('setup-video-container');
    this.gameVideoContainer = document.getElementById('game-video-container');
    
    this.jumpscareOverlay = document.getElementById('jumpscare-overlay');
  }

  showScreen(screenName) {
    Object.values(this.screens).forEach(screen => {
      if (screen) screen.classList.remove('active');
    });
    
    const target = this.screens[screenName];
    if (target) {
      target.classList.add('active');
    } else {
      console.error(`Screen ${screenName} not found.`);
    }
  }

  updateSetupStatus(isCalibrating, isReady, progress) {
    if (!isReady && isCalibrating) {
      this.setupStatus.textContent = `Calibrating Eye Tracking... ${Math.round(progress * 100)}%`;
      this.setupStatus.className = 'status-text warning';
      this.btnStartGame.disabled = true;
    } else if (isReady) {
      this.setupStatus.textContent = 'Tracking Active. Do not look away.';
      this.setupStatus.className = 'status-text ready';
      this.btnStartGame.disabled = false;
    } else {
      this.setupStatus.textContent = 'Waiting for face detection...';
      this.setupStatus.className = 'status-text warning';
      this.btnStartGame.disabled = true;
    }
  }

  updateTypingHTML(html) {
    this.typingContainer.innerHTML = html;
  }

  updateThreatMeter(threatLevel) {
    // threatLevel is 0.0 to 1.0
    const pct = Math.max(0, Math.min(100, threatLevel * 100));
    this.threatMeterBar.style.width = `${pct}%`;
    
    if (threatLevel > 0.8) {
      this.threatMeterBar.style.backgroundColor = '#ff0000';
      this.threatMeterBar.style.boxShadow = '0 0 20px #ff0000';
    } else if (threatLevel > 0.5) {
      this.threatMeterBar.style.backgroundColor = '#ff6600';
      this.threatMeterBar.style.boxShadow = '0 0 10px #ff6600';
    } else {
      this.threatMeterBar.style.backgroundColor = '#880000';
      this.threatMeterBar.style.boxShadow = 'none';
    }
  }

  moveWebcamToSetup(videoElement) {
    if (this.gameVideoContainer.contains(videoElement)) {
      this.gameVideoContainer.removeChild(videoElement);
    }
    this.setupVideoContainer.appendChild(videoElement);
  }

  moveWebcamToGame(videoElement) {
    if (this.setupVideoContainer.contains(videoElement)) {
      this.setupVideoContainer.removeChild(videoElement);
    }
    this.gameVideoContainer.appendChild(videoElement);
  }

  triggerJumpscare() {
    this.jumpscareOverlay.style.opacity = '1';
    setTimeout(() => {
      this.jumpscareOverlay.style.opacity = '0';
    }, 200);
  }
}
