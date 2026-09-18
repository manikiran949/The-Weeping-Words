import * as THREE from 'three';
import angelImgUrl from '../../image.png';

/**
 * WeepingAngel.js
 * Uses image.png as a billboard sprite.
 * Rule: NEVER looks at you when you're looking at it.
 * When you look away it MOVES — fast.
 */
export class WeepingAngel {
  constructor() {
    this.group = new THREE.Group();

    // Start at a visible distance
    this.baseZ = -40;
    this.group.position.set(0, -5, this.baseZ);

    this.time = 0;
    this.isLunging = false;
    this.lungeTime = 0;

    // Whether the player is currently watching (frozen)
    this.frozen = true;

    // Cold blue point light (flares during lunge)
    this.glowLight = new THREE.PointLight(0x4488ff, 0, 12);
    this.glowLight.position.set(0, 2, 1);
    this.group.add(this.glowLight);

    this._buildSprite();
  }

  /* ─── Build ─────────────────────────────────────────────────── */

  _buildSprite() {
    const loader = new THREE.TextureLoader();
    loader.load(
      angelImgUrl,
      (texture) => {
        // Preserve alpha so the background of the PNG is transparent
        texture.colorSpace = THREE.SRGBColorSpace;

        // Figure out aspect ratio from the image
        const img = texture.image;
        const aspect = img.width / img.height;

        // Make the sprite tall — roughly human-statue proportions
        const height = 18;
        const width = height * aspect;

        const geom = new THREE.PlaneGeometry(width, height);
        const mat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.1,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        this.sprite = new THREE.Mesh(geom, mat);
        // Offset so feet sit on the ground plane (y = -5 in world space)
        this.sprite.position.set(0, height / 2 - 5, 0);
        this.group.add(this.sprite);
      },
      undefined,
      (err) => {
        console.error('[WeepingAngel] Failed to load image.png:', err);
        // Fallback: simple grey box so something is visible
        const geom = new THREE.BoxGeometry(6, 14, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x888877, flatShading: true });
        this.sprite = new THREE.Mesh(geom, mat);
        this.sprite.position.y = 2;
        this.group.add(this.sprite);
      }
    );
  }

  /* ─── Update ─────────────────────────────────────────────────── */

  update(delta) {
    this.time += delta;

    if (this.isLunging) {
      this.lungeTime += delta;
      // Rush toward camera
      this.group.position.z += 90 * delta;
      // Scale up to fill screen
      const scale = 1 + this.lungeTime * 10;
      this.group.scale.setScalar(scale);
      // Eyes flare blue
      this.glowLight.intensity = 4 + this.lungeTime * 20;

    } else if (this.frozen) {
      // Completely still — stone cold
      this.glowLight.intensity = 0;

    } else {
      // Moving — faint eerie sway while approaching
      this.group.position.y = -5 + Math.sin(this.time * 2.5) * 0.2;
      // Faint blue flicker
      this.glowLight.intensity = 0.3 + Math.sin(this.time * 12) * 0.15;
    }
  }

  setThreatLevel(level) {
    if (this.isLunging) return;
    // Approach from -40 to -8
    const targetZ = this.baseZ + level * 32;
    this.group.position.z += (targetZ - this.group.position.z) * 0.05;
  }

  setFrozen(frozen) {
    this.frozen = frozen;
  }

  lunge() {
    this.isLunging = true;
    this.lungeTime = 0;
    this.frozen = false;
  }

  reset() {
    this.isLunging = false;
    this.lungeTime = 0;
    this.frozen = true;
    this.group.scale.setScalar(1);
    this.group.position.set(0, -5, this.baseZ);
    this.glowLight.intensity = 0;
  }
}
