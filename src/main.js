import { WebcamManager } from './WebcamManager.js';
import { FaceTracker } from './FaceTracker.js';
import { TypingEngine } from './typing/TypingEngine.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { SceneManager } from './scene/SceneManager.js';
import { UIManager } from './ui/UIManager.js';

// ─── Constants ───────────────────────────────────────────────────

const INCANTATION = "Exorcizamus te, omnis immunde spiritus, omnis satanica potestas, omnis incursio infernalis adversarii, omnis legio, omnis congregatio et secta diabolica. Ergo, draco maledicte et omnis legio diabolica, adjuramus te.";
const PENALTY_SPEED = 0.5; // Threat increase per second when looking away
const RECOVERY_SPEED = 0.1; // Threat decrease per second when looking at screen

// ─── Game State ──────────────────────────────────────────────────

const GAME_STATE = {
  INTRO: 'intro',
  SETUP: 'setup',
  PLAYING: 'playing',
  JUMPSCARE: 'jumpscare',
  WIN: 'win',
  GAMEOVER: 'gameover'
};

let currentState = GAME_STATE.INTRO;
let threatLevel = 0.0; // 0.0 to 1.0

// ─── Instances ────────────────────────────────────────────────────

const webcam = new WebcamManager('webcam-video');
const tracker = new FaceTracker();
const audio = new AudioEngine();
const ui = new UIManager();
const typing = new TypingEngine(INCANTATION);
const scene = new SceneManager(document.getElementById('scene-container'));

// ─── Telemetry UI Elements ────────────────────────────────────────

const telHud = document.getElementById('telemetry-hud');
const telPitch = document.getElementById('tel-pitch');
const telEar = document.getElementById('tel-ear');
const telGaze = document.getElementById('tel-gaze');
const telBadge = document.getElementById('tel-badge');

function updateTelemetry() {
  if (currentState !== GAME_STATE.SETUP && currentState !== GAME_STATE.PLAYING) {
    telHud.classList.add('hidden');
    return;
  }
  
  telHud.classList.remove('hidden');

  if (!tracker.hasFace) {
    telPitch.textContent = '—';
    telEar.textContent = '—';
    telGaze.textContent = '—';
    telBadge.textContent = 'NO FACE DETECTED';
    telBadge.className = 'telemetry-row badge danger';
    return;
  }

  // Pitch
  const pitchDev = tracker.pitchDeviation;
  telPitch.textContent = `${pitchDev > 0 ? '+' : ''}${pitchDev.toFixed(1)}°`;
  telPitch.className = tracker.isLookingDown ? 'danger' : '';

  // EAR
  telEar.textContent = tracker.earValue.toFixed(3);
  telEar.className = tracker.eyesClosed ? 'danger' : '';

  // Gaze
  telGaze.textContent = tracker.eyeGazeDown.toFixed(3);
  telGaze.className = tracker.isGazingDown ? 'danger' : '';

  // Badge
  if (tracker.isLookingDown) {
    telBadge.textContent = 'LOOKING DOWN';
    telBadge.className = 'telemetry-row badge danger';
  } else if (tracker.isGazingDown) {
    telBadge.textContent = 'EYES LOOKING DOWN';
    telBadge.className = 'telemetry-row badge danger';
  } else if (tracker.eyesClosed) {
    telBadge.textContent = 'EYES CLOSED';
    telBadge.className = 'telemetry-row badge danger';
  } else {
    telBadge.textContent = 'TRACKING OK';
    telBadge.className = 'telemetry-row badge';
  }
}

// ─── Event Listeners & Wiring ─────────────────────────────────────

// Intro -> Setup
ui.btnGrantCamera.addEventListener('click', async () => {
  ui.btnGrantCamera.disabled = true;
  document.getElementById('camera-error').hidden = true;

  try {
    // Must initialize audio context on user gesture
    audio.init();

    await webcam.start();
    // Video element is already in setup-video-container (hardcoded in HTML)
    
    await tracker.initialize();
    
    currentState = GAME_STATE.SETUP;
    ui.showScreen('setup');
    
    // Start tracking loop
    requestAnimationFrame(gameLoop);
  } catch (err) {
    console.error(err);
    document.getElementById('camera-error').textContent = err.message || 'Camera access denied.';
    document.getElementById('camera-error').hidden = false;
    ui.btnGrantCamera.disabled = false;
  }
});

// Setup -> Playing
ui.btnStartGame.addEventListener('click', () => {
  currentState = GAME_STATE.PLAYING;
  threatLevel = 0.0;
  
  // Move the video AND its landmark canvas to the game container
  const setupCanvas = document.getElementById('landmark-canvas-setup');
  ui.moveWebcamToGame(webcam.videoElement);
  if (setupCanvas) {
    document.getElementById('game-video-container').appendChild(setupCanvas);
  }
  ui.showScreen('game');
  
  // Start heartbeat and typing
  audio.startHeartbeat();
  typing.start();
  updateTypingUI();
});

// Restart logic
const restartGame = () => {
  threatLevel = 0.0;
  tracker.recalibrate();
  typing.stop();
  audio.stopHeartbeat();
  scene.reset();
  currentState = GAME_STATE.SETUP;
  
  // Move video and canvas back to setup container
  ui.moveWebcamToSetup(webcam.videoElement);
  const setupCanvas = document.getElementById('landmark-canvas-setup');
  if (setupCanvas) {
    document.getElementById('setup-video-container').appendChild(setupCanvas);
  }
  ui.showScreen('setup');
};

ui.btnRestartWin.addEventListener('click', restartGame);
ui.btnRestartLose.addEventListener('click', restartGame);

// Typing Events
const typingLineLabel = document.getElementById('typing-line-label');
const typingProgressBar = document.getElementById('typing-progress-bar');

function updateTypingUI() {
  ui.updateTypingHTML(typing.getHTML());
  // Update progress bar
  typingProgressBar.style.width = `${(typing.getProgress() * 100).toFixed(1)}%`;
  // Update line label
  typingLineLabel.textContent = typing.getLineLabel();
}

typing.onUpdate = () => {
  updateTypingUI();
};

typing.onLineChange = () => {
  // Trigger a quick slide-in animation when the line changes
  const container = ui.typingContainer;
  container.classList.remove('line-entering');
  // Force reflow so the animation re-triggers
  void container.offsetWidth;
  container.classList.add('line-entering');
};

typing.onCorrect = () => {
  audio.playType();
  // Demon is frozen, but typing correctly does not push it back.
};

typing.onError = () => {
  audio.playError();
  // Small penalty bump
  threatLevel = Math.min(1.0, threatLevel + 0.05);
};

typing.onBackspace = () => {
  audio.playBackspace();
};

typing.onComplete = () => {
  currentState = GAME_STATE.WIN;
  audio.stopHeartbeat();
  ui.showScreen('win');
};

// ─── Main Game Loop ───────────────────────────────────────────────

let lastTime = performance.now();

function gameLoop(now) {
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  // 1. Process Face Tracking
  tracker.detect(webcam.videoElement);
  
  // Update canvas overlay — we reuse landmark-canvas-setup which follows the video
  const canvas = document.getElementById('landmark-canvas-setup');
  if (canvas) {
    tracker.drawLandmarks(canvas, webcam.videoElement);
  }

  // 2. State specific logic
  let renderThreat = threatLevel;
  
  if (currentState === GAME_STATE.SETUP) {
    ui.updateSetupStatus(!tracker.isCalibrated, tracker.hasFace && tracker.isCalibrated, tracker.calibrationProgress);
  } 
  else if (currentState === GAME_STATE.PLAYING) {
    // Penalty logic (cumulative threat)
    const isWatching = !tracker.isLookingAway;
    if (!isWatching) {
      threatLevel += PENALTY_SPEED * delta;
      scene.applyCameraShake(threatLevel);
    } else {
      // Angel is frozen when you look at the screen
      scene.applyCameraShake(0);
    }
    
    threatLevel = Math.max(0.0, Math.min(1.0, threatLevel));
    
    // Update Systems
    ui.updateThreatMeter(threatLevel);
    audio.setHeartbeatIntensity(threatLevel);
    
    // Game Over condition
    if (threatLevel >= 1.0) {
      currentState = GAME_STATE.JUMPSCARE;
      typing.stop();
      audio.stopHeartbeat();
      audio.playJumpscare();
      scene.triggerJumpscare();
      
      // Delay final red screen so we see the lunge
      setTimeout(() => {
        if (currentState === GAME_STATE.JUMPSCARE) {
          currentState = GAME_STATE.GAMEOVER;
          ui.triggerJumpscare();
          ui.showScreen('gameover');
          scene.applyCameraShake(0);
        }
      }, 400);
    }
  }
  else if (currentState === GAME_STATE.JUMPSCARE) {
    scene.applyCameraShake(2.0); // max shake
    renderThreat = 2.0; // max shader glitch
  }

  // Update telemetry overlay
  updateTelemetry();

  // 3. Render 3D Scene (runs in all states to keep effects alive)
  const isWatchingNow = currentState === GAME_STATE.PLAYING ? !tracker.isLookingAway : true;
  scene.update(renderThreat, isWatchingNow);

  requestAnimationFrame(gameLoop);
}

// ─── Init ─────────────────────────────────────────────────────────

console.log('[Typing Exorcism] Main loaded.');
ui.showScreen('intro');
