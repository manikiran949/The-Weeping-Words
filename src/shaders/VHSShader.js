/**
 * VHSShader.js
 * Custom Three.js post-processing shader for VHS and glitch effects.
 */

export const VHSShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'time': { value: 0.0 },
    'intensity': { value: 0.0 } // 0.0 to 1.0 (increases as demon approaches)
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;

    // Pseudo-random generator
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;

      // 1. CRT Curvature
      // Only curve slightly based on intensity
      vec2 crtUv = uv * 2.0 - 1.0;
      float crtOffset = dot(crtUv, crtUv) * 0.05 * intensity;
      uv = uv + crtUv * crtOffset;

      // Ensure we don't sample outside bounds after curving
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      // 2. Scanlines
      float scanline = sin(uv.y * 800.0) * 0.04;
      
      // 3. Glitch / Tracking errors (horizontal shift based on intensity)
      float glitchOffset = 0.0;
      if (intensity > 0.1) {
        float noiseY = rand(vec2(floor(uv.y * 20.0), time));
        if (noiseY > (0.9 - intensity * 0.3)) {
          glitchOffset = (rand(vec2(time, uv.y)) - 0.5) * 0.1 * intensity;
        }
      }
      uv.x += glitchOffset;

      // 4. Chromatic Aberration
      float rOffset = 0.005 * intensity;
      float bOffset = -0.005 * intensity;

      vec4 color;
      color.r = texture2D(tDiffuse, vec2(uv.x + rOffset, uv.y)).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, vec2(uv.x + bOffset, uv.y)).b;
      color.a = 1.0;

      // Apply scanlines
      color.rgb -= scanline;

      // 5. Noise (static)
      float noise = (rand(uv + time) - 0.5) * 0.15 * (0.5 + intensity * 0.5);
      color.rgb += noise;

      // 6. Vignette
      float dist = distance(vUv, vec2(0.5, 0.5));
      color.rgb *= smoothstep(0.8, 0.2, dist * (1.0 + intensity * 0.5));

      gl_FragColor = color;
    }
  `
};
