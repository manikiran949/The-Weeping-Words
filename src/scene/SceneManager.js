import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VHSShader } from '../shaders/VHSShader.js';
import { WeepingAngel } from './WeepingAngel.js';

/**
 * SceneManager.js
 * Manages the Three.js scene, camera, renderer, post-processing, and the Weeping Angel.
 * Atmosphere: cold moonlit graveyard.
 */
export class SceneManager {
  constructor(container) {
    this.container = container;

    // Core Three.js setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050505, 0.015); // Deep dark fog
    this.scene.background = new THREE.Color(0x050505);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // ── Lighting ──────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x111111);
    this.scene.add(ambientLight);

    // ── The Weeping Angel (image sprite) ─────────────────────────
    this.angel = new WeepingAngel();
    this.scene.add(this.angel.group);

    // ── Post-processing ───────────────────────────────────────────
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.vhsPass = new ShaderPass(VHSShader);
    this.composer.addPass(this.vhsPass);

    this.clock = new THREE.Clock();

    this._boundResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this._boundResize);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Update scene, angel, and shader effects.
   * @param {number} threatLevel 0.0 (safe) to 1.0+ (lunging)
   * @param {boolean} [isWatching=true] – whether the player is currently watching
   */
  update(threatLevel, isWatching = true) {
    const delta = this.clock.getDelta();

    // Tell the angel whether to freeze or move
    this.angel.setFrozen(isWatching);
    this.angel.update(delta);
    this.angel.setThreatLevel(threatLevel);

    // Shader
    this.vhsPass.uniforms['time'].value += delta;
    this.vhsPass.uniforms['intensity'].value = threatLevel;

    this.composer.render();
  }

  applyCameraShake(intensity) {
    if (intensity > 0) {
      this.camera.position.x = (Math.random() - 0.5) * intensity * 0.5;
      this.camera.position.y = (Math.random() - 0.5) * intensity * 0.5;
    } else {
      this.camera.position.x = 0;
      this.camera.position.y = 0;
    }
  }

  triggerJumpscare() {
    this.angel.lunge();
  }

  reset() {
    this.angel.reset();
  }

  destroy() {
    window.removeEventListener('resize', this._boundResize);
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
