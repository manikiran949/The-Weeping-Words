/**
 * main.js — Entry point for the Face Tracking Prototype.
 *
 * Orchestrates:
 *  1. Setup screen → user grants camera
 *  2. Initialize webcam + MediaPipe Face Landmarker
 *  3. Run detection loop with real-time debug UI
 */

import { WebcamManager } from './WebcamManager.js';
import { FaceTracker } from './FaceTracker.js';

// ─── DOM References ───────────────────────────────────────────────

const setupScreen = document.getElementById('setup-screen');
const trackingScreen = document.getElementById('tracking-screen');
const btnGrantCamera = document.getElementById('btn-grant-camera');
const cameraError = document.getElementById('camera-error');
const landmarkCanvas = document.getElementById('landmark-canvas');
const gazeBadge = document.getElementById('gaze-status-badge');

// Debug panel elements
const dbgFaceDetected = document.getElementById('dbg-face-detected');
const dbgLookingDown = document.getElementById('dbg-looking-down');
const dbgPenaltyCount = document.getElementById('dbg-penalty-count');
const dbgEyesClosed = document.getElementById('dbg-eyes-closed');
const dbgPitch = document.getElementById('dbg-pitch');
const dbgYaw = document.getElementById('dbg-yaw');
const dbgRoll = document.getElementById('dbg-roll');
const dbgFps = document.getElementById('dbg-fps');

// Sliders
const sliderThreshold = document.getElementById('slider-threshold');
const sliderThresholdVal = document.getElementById('slider-threshold-val');
const sliderDebounce = document.getElementById('slider-debounce');
const sliderDebounceVal = document.getElementById('slider-debounce-val');

// ─── Instances ────────────────────────────────────────────────────

const webcam = new WebcamManager('webcam-video');
const tracker = new FaceTracker();

// ─── Screen Transitions ──────────────────────────────────────────

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  screen.classList.add('active');
}

function showError(msg) {
  cameraError.textContent = msg;
  cameraError.hidden = false;
}

// ─── Slider Wiring ───────────────────────────────────────────────

sliderThreshold.addEventListener('input', () => {
  const val = parseInt(sliderThreshold.value, 10);
  tracker.pitchThreshold = val;
  sliderThresholdVal.textContent = `${val}°`;
});

sliderDebounce.addEventListener('input', () => {
  const val = parseInt(sliderDebounce.value, 10);
  tracker.debounceMs = val;
  sliderDebounceVal.textContent = `${val}ms`;
});

// ─── Camera Grant Button ─────────────────────────────────────────

btnGrantCamera.addEventListener('click', async () => {
  btnGrantCamera.disabled = true;
  btnGrantCamera.textContent = '⏳ Starting camera…';
  cameraError.hidden = true;

  try {
    // Step 1: Start the webcam
    await webcam.start();
    console.log('[main] Webcam started', webcam.dimensions);

    btnGrantCamera.textContent = '🧠 Loading face model…';

    // Step 2: Initialize MediaPipe (downloads model)
    await tracker.initialize();
    console.log('[main] FaceTracker initialized');

    // Step 3: Switch to tracking screen and start the loop
    showScreen(trackingScreen);
    requestAnimationFrame(detectionLoop);
  } catch (err) {
    console.error('[main] Setup error:', err);
    showError(err.message);
    btnGrantCamera.disabled = false;
    btnGrantCamera.innerHTML = '<span class="btn-icon">📷</span> Retry Camera Access';
  }
});

// ─── Detection Loop ──────────────────────────────────────────────

function detectionLoop() {
  // Run face detection on current video frame
  tracker.detect(webcam.videoElement);

  // Draw landmarks overlay
  tracker.drawLandmarks(landmarkCanvas);

  // Update debug UI
  updateDebugPanel();
  updateGazeBadge();

  // Continue loop
  requestAnimationFrame(detectionLoop);
}

// ─── Debug UI Updates ────────────────────────────────────────────

function updateDebugPanel() {
  // Face detected
  if (tracker.hasFace) {
    dbgFaceDetected.textContent = '✓ Yes';
    dbgFaceDetected.className = 'debug-value val-green';
  } else {
    dbgFaceDetected.textContent = '✗ No';
    dbgFaceDetected.className = 'debug-value val-red';
  }

  // Looking down
  if (tracker.isLookingDown) {
    dbgLookingDown.textContent = '⚠ YES';
    dbgLookingDown.className = 'debug-value val-red';
  } else {
    dbgLookingDown.textContent = 'No';
    dbgLookingDown.className = 'debug-value val-green';
  }

  // Penalty count
  dbgPenaltyCount.textContent = tracker.penaltyCount.toString();
  dbgPenaltyCount.className = tracker.penaltyCount > 0
    ? 'debug-value val-amber'
    : 'debug-value';

  // Eyes closed
  if (tracker.eyesClosed) {
    dbgEyesClosed.textContent = '😑 YES';
    dbgEyesClosed.className = 'debug-value val-red';
  } else {
    dbgEyesClosed.textContent = 'No';
    dbgEyesClosed.className = 'debug-value val-green';
  }

  // Head pose values
  dbgPitch.textContent = `${tracker.pitch.toFixed(1)}°`;
  dbgPitch.className = tracker.pitch > tracker.pitchThreshold
    ? 'debug-value val-red'
    : 'debug-value';

  dbgYaw.textContent = `${tracker.yaw.toFixed(1)}°`;
  dbgRoll.textContent = `${tracker.roll.toFixed(1)}°`;

  // FPS
  dbgFps.textContent = `${tracker.fps}`;
  dbgFps.className = tracker.fps >= 20
    ? 'debug-value val-green'
    : tracker.fps >= 10
      ? 'debug-value val-amber'
      : 'debug-value val-red';
}

function updateGazeBadge() {
  // Remove all state classes
  gazeBadge.classList.remove('gaze-unknown', 'gaze-ok', 'gaze-down', 'gaze-no-face');

  if (!tracker.hasFace) {
    gazeBadge.textContent = '⚠ No Face Detected';
    gazeBadge.classList.add('gaze-no-face');
  } else if (tracker.eyesClosed) {
    gazeBadge.textContent = '😑 Eyes Closed!';
    gazeBadge.classList.add('gaze-down');
  } else if (tracker.isLookingDown) {
    gazeBadge.textContent = '🔴 Looking Down!';
    gazeBadge.classList.add('gaze-down');
  } else {
    gazeBadge.textContent = '🟢 Looking at Screen';
    gazeBadge.classList.add('gaze-ok');
  }
}

// ─── Init ─────────────────────────────────────────────────────────

console.log('[Typing Exorcism] Phase 1 — Face Tracking Prototype loaded');
