/**
 * WebcamManager — wraps getUserMedia with error handling.
 * 
 * Provides a <video> element with the live camera stream that can be
 * consumed by both the UI (display) and FaceTracker (analysis).
 */

export class WebcamManager {
  /** @type {HTMLVideoElement} */
  videoElement;

  /** @type {MediaStream | null} */
  #stream = null;

  /**
   * @param {string} videoElementId — ID of the <video> element in the DOM
   */
  constructor(videoElementId) {
    this.videoElement = document.getElementById(videoElementId);
    if (!this.videoElement) {
      throw new Error(`Video element #${videoElementId} not found in DOM`);
    }
  }

  /**
   * Request camera access and start the video stream.
   * @returns {Promise<HTMLVideoElement>} — resolves when video is playing
   * @throws {Error} — on permission denied or no camera available
   */
  async start() {
    try {
      this.#stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      this.videoElement.srcObject = this.#stream;

      // Wait for the video to actually start playing before resolving
      await new Promise((resolve, reject) => {
        this.videoElement.onloadeddata = () => resolve();
        this.videoElement.onerror = (e) => reject(new Error(`Video error: ${e.message}`));
        // Safety timeout
        setTimeout(() => reject(new Error('Video load timeout')), 10000);
      });

      return this.videoElement;
    } catch (err) {
      // Translate browser errors into user-friendly messages
      if (err.name === 'NotAllowedError') {
        throw new Error('Camera permission denied. Please allow camera access and reload.');
      }
      if (err.name === 'NotFoundError') {
        throw new Error('No camera found. Please connect a webcam and reload.');
      }
      if (err.name === 'NotReadableError') {
        throw new Error('Camera is in use by another application. Please close it and reload.');
      }
      throw new Error(`Camera error: ${err.message}`);
    }
  }

  /**
   * Stop the camera stream and release resources.
   */
  stop() {
    if (this.#stream) {
      this.#stream.getTracks().forEach((track) => track.stop());
      this.#stream = null;
    }
    this.videoElement.srcObject = null;
  }

  /**
   * @returns {boolean} — true if camera is actively streaming
   */
  get isActive() {
    return this.#stream !== null && this.#stream.active;
  }

  /**
   * Get the video dimensions (useful for canvas overlay sizing).
   * @returns {{ width: number, height: number }}
   */
  get dimensions() {
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
    };
  }
}
