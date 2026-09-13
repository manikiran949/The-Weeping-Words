import * as THREE from 'three';

/**
 * Demon.js
 * Procedurally generated demon entity using Three.js primitives.
 * Lurks in the dark and lurches toward the camera when the player looks away.
 */
export class Demon {
  constructor() {
    this.group = new THREE.Group();
    
    // Base position (far away)
    this.baseZ = -80;
    this.group.position.set(0, 0, this.baseZ);
    
    // Internal animation time
    this.time = 0;
    
    this.isLunging = false;
    this.lungeTime = 0;
    
    this._buildDemon();
  }

  _buildDemon() {
    // 1. Main body (distorted icosahedron)
    const bodyGeometry = new THREE.IcosahedronGeometry(5, 2);
    // Distort vertices to make it spiky/uneven
    const pos = bodyGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // random distortion
      const noise = 1 + (Math.random() - 0.5) * 0.5;
      pos.setXYZ(i, x * noise, y * noise, z * noise);
    }
    bodyGeometry.computeVertexNormals();
    
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true
    });
    
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.group.add(this.body);
    
    // 2. Glowing red eyes
    const eyeGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    this.leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    this.leftEye.position.set(-1.5, 1, 4.5);
    this.group.add(this.leftEye);
    
    this.rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    this.rightEye.position.set(1.5, 1, 4.5);
    this.group.add(this.rightEye);
    
    // Point lights for the eyes
    const eyeLight = new THREE.PointLight(0xff0000, 2, 20);
    eyeLight.position.set(0, 1, 5);
    this.group.add(eyeLight);
    
    // 3. Floating tendrils
    this.tendrils = [];
    for (let i = 0; i < 6; i++) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.random() * 4 - 2, Math.random() * -4 - 2, Math.random() * 2 - 1),
        new THREE.Vector3(Math.random() * 8 - 4, Math.random() * -8 - 4, Math.random() * 4 - 2)
      ]);
      const tubeGeom = new THREE.TubeGeometry(curve, 20, 0.2, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      
      // Attach to different parts of body
      tube.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
      
      this.tendrils.push({
        mesh: tube,
        speed: Math.random() * 2 + 1,
        offset: Math.random() * Math.PI * 2
      });
      this.group.add(tube);
    }
  }

  update(delta) {
    this.time += delta;
    
    if (this.isLunging) {
      this.lungeTime += delta;
      
      // Lunge forward extremely fast
      this.group.position.z += 80 * delta; 
      
      // Scale up to encompass the screen
      const scale = 1 + this.lungeTime * 15;
      this.body.scale.setScalar(scale);
      
      // Eyes explode in size
      const eyeScale = 2 + this.lungeTime * 30;
      this.leftEye.scale.setScalar(eyeScale);
      this.rightEye.scale.setScalar(eyeScale);
      
    } else {
      // Idle float animation
      this.group.position.y = Math.sin(this.time * 1.5) * 1.5;
      this.body.rotation.y = Math.sin(this.time * 0.5) * 0.2;
      this.body.rotation.z = Math.cos(this.time * 0.3) * 0.1;
      
      // Pulse eyes
      const pulse = (Math.sin(this.time * 5) + 1) * 0.5; // 0 to 1
      const eyeScale = 1 + pulse * 0.2;
      this.leftEye.scale.set(eyeScale, eyeScale, eyeScale);
      this.rightEye.scale.set(eyeScale, eyeScale, eyeScale);
    }
    
    // Writhe tendrils
    this.tendrils.forEach(t => {
      // Writhe much faster during lunge
      const speedMult = this.isLunging ? 6 : 1;
      t.mesh.rotation.x = Math.sin(this.time * t.speed * speedMult + t.offset) * 0.5;
      t.mesh.rotation.z = Math.cos(this.time * t.speed * speedMult + t.offset) * 0.5;
    });
  }

  setThreatLevel(level) {
    if (this.isLunging) return; // Don't override position if lunging
    
    // Level is 0.0 to 1.0
    // Z moves from -80 to -10 (close to camera)
    const targetZ = this.baseZ + (level * 70);
    
    // Smooth lerp toward target Z
    this.group.position.z += (targetZ - this.group.position.z) * 0.05;
  }
  
  lunge() {
    this.isLunging = true;
    this.lungeTime = 0;
  }
  
  reset() {
    this.isLunging = false;
    this.lungeTime = 0;
    this.body.scale.setScalar(1);
    this.group.position.set(0, 0, this.baseZ);
  }
}
