/**
 * FaceTracker — MediaPipe Face Landmarker wrapper for head-pose detection.
 *
 * Detects 478 facial landmarks per frame using Google's Face Landmarker model.
 * Computes head pitch (up/down), yaw (left/right), and roll (tilt) from the
 * landmark positions. The primary output is `isLookingDown` — true when the
 * player's head pitch exceeds a configurable threshold for longer than the
 * debounce window.
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/** CDN base for MediaPipe WASM + model files */
const MEDIAPIPE_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const FACE_LANDMARKER_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * Key landmark indices used for head pose estimation.
 * Reference: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
 */
const LANDMARKS = {
  NOSE_TIP: 1,
  FOREHEAD: 10,
  CHIN: 152,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  LEFT_EYE_INNER: 133,
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
};

export class FaceTracker {
  /** @type {FaceLandmarker | null} */
  #landmarker = null;

  /** @type {boolean} */
  #ready = false;

  // --- Current frame results ---
  /** @type {boolean} */
  #faceDetected = false;

  /** @type {number} pitch in degrees (positive = looking down) */
  #pitch = 0;
  /** @type {number} yaw in degrees (positive = looking right) */
  #yaw = 0;
  /** @type {number} roll in degrees (positive = tilting right) */
  #roll = 0;
  /** @type {boolean} whether eyes are currently closed */
  #eyesClosed = false;

  // --- Gaze state ---
  /** @type {number} threshold in degrees — deviation from baseline to trigger */
  pitchThreshold = 10;
  /** @type {number} debounce in ms — must sustain look-away this long */
  debounceMs = 300;
  /** @type {number} EAR threshold — below this = eyes closed */
  earThreshold = 0.18;

  /** @type {number} raw average Eye Aspect Ratio */
  #earValue = 0;

  // --- Calibration ---
  /** @type {number[]} raw pitch samples collected during calibration */
  #calibrationSamples = [];
  /** @type {number} how many frames to collect for calibration */
  #calibrationFrames = 60;
  /** @type {boolean} whether calibration is complete */
  #calibrated = false;
  /** @type {number} the baseline pitch when looking at screen */
  #baselinePitch = 0;

  /** @type {boolean} debounced output: is the player looking down? */
  #isLookingDown = false;
  /** @type {number | null} timestamp when raw "looking down" started */
  #lookDownStartTime = null;

  /** @type {number} how many times we've confirmed a look-down event */
  penaltyCount = 0;

  // --- Performance ---
  /** @type {number} */
  #lastDetectionTime = 0;
  /** @type {number} */
  #detectionFps = 0;
  #fpsFrameCount = 0;
  #fpsLastSecond = 0;

  // --- Landmark drawing ---
  /** @type {import('@mediapipe/tasks-vision').NormalizedLandmark[][] | null} */
  #lastLandmarks = null;

  /**
   * Initialize the FaceLandmarker. Downloads WASM runtime + model.
   * Call this once before starting detection.
   */
  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);

    this.#landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL,
        delegate: 'GPU', // Use WebGL for acceleration
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    this.#ready = true;
    console.log('[FaceTracker] MediaPipe Face Landmarker initialized');
  }

  /**
   * Process a single video frame. Call this in your animation loop.
   * @param {HTMLVideoElement} video — the webcam video element
   */
  detect(video) {
    if (!this.#ready || !this.#landmarker) return;
    if (video.readyState < 2) return; // not enough data yet

    const now = performance.now();

    // MediaPipe requires strictly increasing timestamps
    if (now <= this.#lastDetectionTime) return;

    const result = this.#landmarker.detectForVideo(video, now);
    this.#lastDetectionTime = now;

    // --- FPS counter ---
    this.#fpsFrameCount++;
    if (now - this.#fpsLastSecond >= 1000) {
      this.#detectionFps = this.#fpsFrameCount;
      this.#fpsFrameCount = 0;
      this.#fpsLastSecond = now;
    }

    // --- Process results ---
    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
      this.#faceDetected = true;
      const landmarks = result.faceLandmarks[0];
      this.#lastLandmarks = result.faceLandmarks;
      this.#computeHeadPose(landmarks);
      this.#computeEyeState(landmarks);

      // --- Calibration phase ---
      if (!this.#calibrated) {
        this.#calibrationSamples.push(this.#pitch);
        if (this.#calibrationSamples.length >= this.#calibrationFrames) {
          // Average the samples to get baseline
          const sum = this.#calibrationSamples.reduce((a, b) => a + b, 0);
          this.#baselinePitch = sum / this.#calibrationSamples.length;
          this.#calibrated = true;
          console.log(`[FaceTracker] Calibrated! Baseline pitch: ${this.#baselinePitch.toFixed(1)}°`);
        }
        return; // Don't trigger penalties during calibration
      }

      this.#updateGazeState(now);
    } else {
      this.#faceDetected = false;
      this.#lastLandmarks = null;
      this.#pitch = 0;
      this.#yaw = 0;
      this.#roll = 0;
      this.#eyesClosed = false;
      // No face = treat as looking away
      this.#updateGazeState(now, true);
    }
  }

  /**
   * Compute head pitch, yaw, and roll from key facial landmarks.
   * Uses geometric relationships between nose, forehead, chin, and ears.
   *
   * @param {import('@mediapipe/tasks-vision').NormalizedLandmark[]} lm
   */
  #computeHeadPose(lm) {
    const noseTip = lm[LANDMARKS.NOSE_TIP];
    const forehead = lm[LANDMARKS.FOREHEAD];
    const chin = lm[LANDMARKS.CHIN];
    const leftEar = lm[LANDMARKS.LEFT_EAR];
    const rightEar = lm[LANDMARKS.RIGHT_EAR];

    // --- PITCH (looking up/down) ---
    // Vertical displacement between forehead and nose tip.
    // When looking straight, the nose is significantly below the forehead.
    // When looking down, the nose rises closer to forehead level (or above).
    //
    // We use the z-component (depth) difference between nose and forehead
    // as the primary pitch signal, combined with vertical displacement.
    const dy = noseTip.y - forehead.y; // vertical separation
    const dz = noseTip.z - forehead.z; // depth difference

    // atan2 of depth vs vertical gives us the raw pitch angle
    this.#pitch = Math.atan2(-dz, dy) * (180 / Math.PI);

    // --- YAW (looking left/right) ---
    // Compare horizontal distance of nose from the midpoint of the ears
    const earMidX = (leftEar.x + rightEar.x) / 2;
    const earSpan = Math.abs(leftEar.x - rightEar.x);
    if (earSpan > 0.001) {
      this.#yaw = ((noseTip.x - earMidX) / earSpan) * 90;
    }

    // --- ROLL (head tilt) ---
    // Angle of the line between the two ears relative to horizontal
    this.#roll = Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x) * (180 / Math.PI);
  }

  /**
   * Compute eye aspect ratio (EAR) to detect blinks/closed eyes.
   *
   * @param {import('@mediapipe/tasks-vision').NormalizedLandmark[]} lm
   */
  #computeEyeState(lm) {
    const leftInner = lm[LANDMARKS.LEFT_EYE_INNER];
    const leftOuter = lm[LANDMARKS.LEFT_EYE_OUTER];
    const leftTop = lm[LANDMARKS.LEFT_EYE_TOP];
    const leftBottom = lm[LANDMARKS.LEFT_EYE_BOTTOM];

    const rightInner = lm[LANDMARKS.RIGHT_EYE_INNER];
    const rightOuter = lm[LANDMARKS.RIGHT_EYE_OUTER];
    const rightTop = lm[LANDMARKS.RIGHT_EYE_TOP];
    const rightBottom = lm[LANDMARKS.RIGHT_EYE_BOTTOM];

    const getDistance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const leftEAR = getDistance(leftTop, leftBottom) / getDistance(leftInner, leftOuter);
    const rightEAR = getDistance(rightTop, rightBottom) / getDistance(rightInner, rightOuter);

    const averageEAR = (leftEAR + rightEAR) / 2.0;
    this.#earValue = averageEAR;

    // Compare against configurable threshold
    this.#eyesClosed = averageEAR < this.earThreshold;
  }

  /**
   * Update the debounced looking-down state.
   * Uses ONLY head pitch — eye-close is tracked independently.
   * @param {number} now — current timestamp
   * @param {boolean} [forceDown=false] — force "looking down" (e.g. no face)
   */
  #updateGazeState(now, forceDown = false) {
    // Compare current pitch against calibrated baseline
    // Deviation = how far pitch has shifted from neutral (positive = looking down)
    const pitchDeviation = this.#baselinePitch - this.#pitch;
    const rawDown = forceDown || pitchDeviation > this.pitchThreshold;

    if (rawDown) {
      // Start or continue the look-down timer
      if (this.#lookDownStartTime === null) {
        this.#lookDownStartTime = now;
      }
      // Check if debounce period has elapsed
      if (now - this.#lookDownStartTime >= this.debounceMs) {
        if (!this.#isLookingDown) {
          // Transition: was OK → now looking down
          this.#isLookingDown = true;
          this.penaltyCount++;
        }
      }
    } else {
      // Reset
      this.#lookDownStartTime = null;
      this.#isLookingDown = false;
    }
  }

  /**
   * Draw landmark points onto a canvas overlay (for debugging).
   * @param {HTMLCanvasElement} canvas
   */
  drawLandmarks(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas resolution to its display size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.#lastLandmarks || this.#lastLandmarks.length === 0) return;

    const landmarks = this.#lastLandmarks[0];
    const w = canvas.width;
    const h = canvas.height;

    // Draw all landmarks as tiny dots
    ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
    for (const lm of landmarks) {
      const x = lm.x * w;
      const y = lm.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight key landmarks used for pose estimation
    const keyIndices = Object.values(LANDMARKS);
    ctx.fillStyle = '#ff3355';
    for (const idx of keyIndices) {
      const lm = landmarks[idx];
      const x = lm.x * w;
      const y = lm.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw pitch direction indicator
    const nose = landmarks[LANDMARKS.NOSE_TIP];
    const forehead = landmarks[LANDMARKS.FOREHEAD];
    ctx.strokeStyle = this.#isLookingDown ? '#ff3355' : '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(forehead.x * w, forehead.y * h);
    ctx.lineTo(nose.x * w, nose.y * h);
    ctx.stroke();
  }

  // --- Public getters ---

  get isReady() {
    return this.#ready;
  }

  get hasFace() {
    return this.#faceDetected;
  }

  get isLookingDown() {
    return this.#isLookingDown;
  }

  get pitch() {
    return this.#pitch;
  }

  get yaw() {
    return this.#yaw;
  }

  get roll() {
    return this.#roll;
  }

  get eyesClosed() {
    return this.#eyesClosed;
  }

  /** Raw Eye Aspect Ratio value (higher = more open) */
  get earValue() {
    return this.#earValue;
  }

  /**
   * Combined signal: player is looking away from the screen.
   * True if head is tilted down OR eyes are closed (after debounce).
   * Use this in the game for demon-advance logic.
   */
  get isLookingAway() {
    return this.#isLookingDown || this.#eyesClosed;
  }

  get isCalibrated() {
    return this.#calibrated;
  }

  /** Calibration progress as 0–1 */
  get calibrationProgress() {
    if (this.#calibrated) return 1;
    return this.#calibrationSamples.length / this.#calibrationFrames;
  }

  get baselinePitch() {
    return this.#baselinePitch;
  }

  /** Current deviation from baseline (positive = looking down) */
  get pitchDeviation() {
    return this.#baselinePitch - this.#pitch;
  }

  /** Reset calibration to re-capture baseline */
  recalibrate() {
    this.#calibrated = false;
    this.#calibrationSamples = [];
    this.#baselinePitch = 0;
    this.penaltyCount = 0;
    console.log('[FaceTracker] Recalibration started');
  }

  get fps() {
    return this.#detectionFps;
  }

  /**
   * Clean up MediaPipe resources.
   */
  destroy() {
    if (this.#landmarker) {
      this.#landmarker.close();
      this.#landmarker = null;
    }
    this.#ready = false;
  }
}
