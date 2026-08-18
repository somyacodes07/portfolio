import * as THREE from 'three';

export interface PixelBlastOptions {
  colors?: string[];
  pixelSize?: number;
  patternScale?: number;
  speed?: number;
  edgeFade?: number;
  ripples?: boolean;
}

export class PixelBlast {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;

  private options: Required<PixelBlastOptions>;
  private paletteTexture: THREE.DataTexture;
  private material: THREE.ShaderMaterial;

  private mouse: THREE.Vector2 = new THREE.Vector2(-10, -10);
  private ripples: THREE.Vector2[] = Array.from({ length: 8 }, () => new THREE.Vector2(-10, -10));
  private rippleTimes: number[] = new Array(8).fill(-100);
  private rippleIntensities: number[] = new Array(8).fill(0);
  private currentRippleIndex: number = 0;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private startTime: number = performance.now();

  constructor(container: HTMLElement, options: PixelBlastOptions = {}) {
    this.container = container;
    this.options = {
      colors: options.colors || ['#3B82F6', '#8B5CF6', '#06B6D4', '#6366F1', '#38BDF8'],
      pixelSize: options.pixelSize ?? 6,
      patternScale: options.patternScale ?? 2.5,
      speed: options.speed ?? 0.5,
      edgeFade: options.edgeFade ?? 0.25,
      ripples: options.ripples ?? true,
    };

    // Container styling
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';
    this.container.style.pointerEvents = 'none';

    // 1. Three.js Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
       1,  1, 0,
      -1, -1, 0,
       1,  1, 0,
      -1,  1, 0,
    ]);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 0,
      1, 1,
      0, 1,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // 3. Palette Texture Creation
    this.paletteTexture = this.createPaletteTexture(this.options.colors);

    // 4. Pixel Blast Material
    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uPalette;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uPixelSize;
        uniform float uPatternScale;
        uniform float uSpeed;
        uniform float uEdgeFade;
        uniform vec2 uRipples[8];
        uniform float uRippleTimes[8];
        uniform float uRippleIntensities[8];

        varying vec2 vUv;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 gridCount = uResolution / max(1.0, uPixelSize);
          vec2 gridUv = floor(vUv * gridCount) / gridCount;
          vec2 cellUv = fract(vUv * gridCount);

          float n = hash(gridUv);
          vec2 st = gridUv * uPatternScale;
          float wave = sin(st.x * 7.0 + st.y * 7.0 + uTime * uSpeed * 2.0 + n * 4.0) * 0.5 + 0.5;

          float rippleTotal = 0.0;
          for (int i = 0; i < 8; i++) {
            float rAge = uTime - uRippleTimes[i];
            if (rAge >= 0.0 && rAge < 2.5 && uRippleIntensities[i] > 0.01) {
              vec2 diff = (gridUv - uRipples[i]);
              diff.x *= uResolution.x / uResolution.y;
              float dist = length(diff);
              float ring = sin(dist * 30.0 - rAge * 9.0) * exp(-dist * 4.5) * exp(-rAge * 1.6);
              rippleTotal += max(0.0, ring) * uRippleIntensities[i];
            }
          }

          vec2 mDiff = (gridUv - uMouse);
          mDiff.x *= uResolution.x / uResolution.y;
          float mDist = length(mDiff);
          float mouseGlow = exp(-mDist * mDist * 22.0) * 0.75;

          float totalIntensity = (wave * 0.22 + rippleTotal * 0.9 + mouseGlow * 0.7);

          // Grid Cell Border (Pixelated gap)
          float border = step(0.08, cellUv.x) * step(cellUv.x, 0.92) * step(0.08, cellUv.y) * step(cellUv.y, 0.92);
          totalIntensity *= border;

          // Edge Fade out at borders
          vec2 fade = smoothstep(0.0, uEdgeFade, vUv) * smoothstep(0.0, uEdgeFade, 1.0 - vUv);
          totalIntensity *= fade.x * fade.y;

          vec4 col = texture2D(uPalette, vec2(clamp(totalIntensity, 0.01, 0.98), 0.5));
          float alpha = smoothstep(0.02, 0.8, totalIntensity) * 0.55;

          gl_FragColor = vec4(col.rgb, alpha);
        }
      `,
      uniforms: {
        uPalette: { value: this.paletteTexture },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(this.container.clientWidth, this.container.clientHeight) },
        uMouse: { value: this.mouse },
        uPixelSize: { value: this.options.pixelSize },
        uPatternScale: { value: this.options.patternScale },
        uSpeed: { value: this.options.speed },
        uEdgeFade: { value: this.options.edgeFade },
        uRipples: { value: this.ripples },
        uRippleTimes: { value: this.rippleTimes },
        uRippleIntensities: { value: this.rippleIntensities },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.quad = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.quad);

    // Event Binding
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('mousemove', this.onPointerMove, { passive: true });
    window.addEventListener('touchmove', this.onPointerMove, { passive: true });
    window.addEventListener('mousedown', this.onPointerDown, { passive: true });
    window.addEventListener('touchstart', this.onPointerDown, { passive: true });

    this.start();
  }

  private createPaletteTexture(colors: string[]): THREE.DataTexture {
    const size = 256;
    const data = new Uint8Array(size * 4);
    const colorObjs = colors.map((c) => new THREE.Color(c));

    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      const scaled = t * (colorObjs.length - 1);
      const index = Math.floor(scaled);
      const factor = scaled - index;

      const c1 = colorObjs[index];
      const c2 = colorObjs[Math.min(index + 1, colorObjs.length - 1)];

      data[i * 4 + 0] = Math.round((c1.r + (c2.r - c1.r) * factor) * 255);
      data[i * 4 + 1] = Math.round((c1.g + (c2.g - c1.g) * factor) * 255);
      data[i * 4 + 2] = Math.round((c1.b + (c2.b - c1.b) * factor) * 255);
      data[i * 4 + 3] = 255;
    }

    const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  public setColors(colors: string[]) {
    if (!colors || colors.length === 0) return;
    this.options.colors = colors;
    if (this.paletteTexture) {
      this.paletteTexture.dispose();
    }
    this.paletteTexture = this.createPaletteTexture(colors);
    this.material.uniforms.uPalette.value = this.paletteTexture;
    this.material.uniforms.uPalette.value.needsUpdate = true;
  }

  private addRipple(x: number, y: number, intensity: number = 1.0) {
    if (!this.options.ripples) return;
    const idx = this.currentRippleIndex;
    this.ripples[idx].set(x, y);
    this.rippleTimes[idx] = (performance.now() - this.startTime) / 1000;
    this.rippleIntensities[idx] = intensity;
    this.currentRippleIndex = (this.currentRippleIndex + 1) % 8;
  }

  private onPointerMove(e: MouseEvent | TouchEvent) {
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    const x = clientX / window.innerWidth;
    const y = 1.0 - clientY / window.innerHeight;

    this.mouse.set(x, y);

    if (Math.random() < 0.25) {
      this.addRipple(x, y, 0.6 + Math.random() * 0.4);
    }
  }

  private onPointerDown(e: MouseEvent | TouchEvent) {
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else {
      return;
    }

    const x = clientX / window.innerWidth;
    const y = 1.0 - clientY / window.innerHeight;

    for (let i = 0; i < 3; i++) {
      this.addRipple(x + (Math.random() - 0.5) * 0.05, y + (Math.random() - 0.5) * 0.05, 1.2);
    }
  }

  private onWindowResize() {
    if (!this.container) return;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.material.uniforms.uResolution.value.set(this.container.clientWidth, this.container.clientHeight);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;

      const elapsed = (performance.now() - this.startTime) / 1000;
      this.material.uniforms.uTime.value = elapsed;

      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy() {
    this.stop();

    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onPointerMove);
    window.removeEventListener('touchmove', this.onPointerMove);
    window.removeEventListener('mousedown', this.onPointerDown);
    window.removeEventListener('touchstart', this.onPointerDown);

    this.paletteTexture.dispose();
    this.material.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
