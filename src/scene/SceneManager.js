import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VHSShader } from '../shaders/VHSShader.js';
import { Demon } from './Demon.js';

/**
 * SceneManager.js
 * Manages the Three.js scene, camera, renderer, post-processing, and the Demon.
 */
export class SceneManager {
  constructor(container) {
    this.container = container;
    
    // Core Three.js setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050505, 0.03); // Deep fog
    
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 0, 0); // Player is at origin
    
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x111111);
    this.scene.add(ambientLight);
    
    // The Demon
    this.demon = new Demon();
    this.scene.add(this.demon.group);
    
    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    
    this.vhsPass = new ShaderPass(VHSShader);
    this.composer.addPass(this.vhsPass);
    
    this.clock = new THREE.Clock();
    
    // Store bound handler so we can remove it later
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
   * Update scene, demon, and shader effects based on threat level.
   * @param {number} threatLevel 0.0 (safe) to 1.0 (dead)
   */
  update(threatLevel) {
    const delta = this.clock.getDelta();
    
    // Update Demon
    this.demon.update(delta);
    this.demon.setThreatLevel(threatLevel);
    
    // Update Shader
    this.vhsPass.uniforms['time'].value += delta;
    this.vhsPass.uniforms['intensity'].value = threatLevel;
    
    // Render through composer
    this.composer.render();
  }

  /**
   * Shake camera based on intensity
   */
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
    this.demon.lunge();
  }
  
  reset() {
    this.demon.reset();
  }

  destroy() {
    window.removeEventListener('resize', this._boundResize);
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
