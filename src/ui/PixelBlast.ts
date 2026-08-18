import * as THREE from 'three';

export interface PixelBlastOptions {
  colors?: string[];
  variant?: 'square' | 'circle';
  pixelSize?: number;
  patternScale?: number;
  patternDensity?: number;
  pixelSizeJitter?: number;
  speed?: number;
  edgeFade?: number;
  enableRipples?: boolean;
  rippleSpeed?: number;
  rippleThickness?: number;
  rippleIntensityScale?: number;
  liquid?: boolean;
  liquidStrength?: number;
  liquidRadius?: number;
  liquidWobbleSpeed?: number;
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
      variant: options.variant || 'square',
      pixelSize: options.pixelSize ?? 4,
      patternScale: options.patternScale ?? 2.0,
      patternDensity: options.patternDensity ?? 1.0,
      pixelSizeJitter: options.pixelSizeJitter ?? 0.0,
      speed: options.speed ?? 0.5,
      edgeFade: options.edgeFade ?? 0.25,
      enableRipples: options.enableRipples ?? true,
      rippleSpeed: options.rippleSpeed ?? 0.4,
      rippleThickness: options.rippleThickness ?? 0.12,
      rippleIntensityScale: options.rippleIntensityScale ?? 1.5,
      liquid: options.liquid ?? false,
      liquidStrength: options.liquidStrength ?? 0.12,
      liquidRadius: options.liquidRadius ?? 1.2,
      liquidWobbleSpeed: options.liquidWobbleSpeed ?? 5.0,
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

    // 4. Pixel Blast Bayer Dithering Material
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
        uniform float uPatternDensity;
        uniform float uPixelJitter;
        uniform float uSpeed;
        uniform float uEdgeFade;

        uniform bool uEnableRipples;
        uniform float uRippleSpeed;
        uniform float uRippleThickness;
        uniform float uRippleIntensityScale;
        uniform vec2 uRipples[8];
        uniform float uRippleTimes[8];
        uniform float uRippleIntensities[8];

        uniform bool uLiquid;
        uniform float uLiquidStrength;
        uniform float uLiquidRadius;
        uniform float uLiquidWobbleSpeed;

        varying vec2 vUv;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float bayer4x4(vec2 p) {
          int x = int(mod(p.x, 4.0));
          int y = int(mod(p.y, 4.0));
          int index = x + y * 4;
          if (index == 0) return 0.0;
          if (index == 1) return 8.0 / 16.0;
          if (index == 2) return 2.0 / 16.0;
          if (index == 3) return 10.0 / 16.0;
          if (index == 4) return 12.0 / 16.0;
          if (index == 5) return 4.0 / 16.0;
          if (index == 6) return 14.0 / 16.0;
          if (index == 7) return 6.0 / 16.0;
          if (index == 8) return 3.0 / 16.0;
          if (index == 9) return 11.0 / 16.0;
          if (index == 10) return 1.0 / 16.0;
          if (index == 11) return 9.0 / 16.0;
          if (index == 12) return 15.0 / 16.0;
          if (index == 13) return 7.0 / 16.0;
          if (index == 14) return 13.0 / 16.0;
          return 5.0 / 16.0;
        }

        void main() {
          vec2 uv = vUv;

          if (uLiquid) {
            vec2 aspectUv = (uv - uMouse);
            aspectUv.x *= uResolution.x / uResolution.y;
            float distToMouse = length(aspectUv);
            if (distToMouse < uLiquidRadius) {
              float factor = (1.0 - distToMouse / uLiquidRadius);
              uv.x += sin(uv.y * 15.0 + uTime * uLiquidWobbleSpeed) * uLiquidStrength * factor;
              uv.y += cos(uv.x * 15.0 + uTime * uLiquidWobbleSpeed) * uLiquidStrength * factor;
            }
          }

          vec2 gridCount = uResolution / max(1.0, uPixelSize);
          vec2 gridPos = floor(uv * gridCount);
          vec2 gridUv = gridPos / gridCount;
          vec2 cellUv = fract(uv * gridCount);

          if (uPixelJitter > 0.0) {
            float j = hash(gridPos) * uPixelJitter;
            gridPos += vec2(j);
          }

          float bayerVal = bayer4x4(gridPos);

          vec2 st = gridUv * uPatternScale * uPatternDensity;
          float wave = sin(st.x * 6.28 + st.y * 6.28 + uTime * uSpeed * 2.5) * 0.5 + 0.5;

          float rippleSum = 0.0;
          if (uEnableRipples) {
            for (int i = 0; i < 8; i++) {
              float age = uTime - uRippleTimes[i];
              if (age >= 0.0 && age < 3.0 && uRippleIntensities[i] > 0.001) {
                vec2 diff = (gridUv - uRipples[i]);
                diff.x *= uResolution.x / uResolution.y;
                float d = length(diff);
                float radius = age * uRippleSpeed;
                float ring = exp(-pow((d - radius) / uRippleThickness, 2.0)) * exp(-age * 1.3);
                rippleSum += ring * uRippleIntensities[i] * uRippleIntensityScale;
              }
            }
          }

          float totalSignal = wave * 0.5 + rippleSum * 1.2;
          float dithered = step(bayerVal * 0.65, totalSignal) * (totalSignal + 0.2);

          // Cell shape: square or circle cell grid
          float cellMask = step(0.05, cellUv.x) * step(cellUv.x, 0.95) * step(0.05, cellUv.y) * step(cellUv.y, 0.95);
          dithered *= cellMask;

          // Edge Fade out towards margins
          vec2 fade = smoothstep(0.0, uEdgeFade, vUv) * smoothstep(0.0, uEdgeFade, 1.0 - vUv);
          dithered *= fade.x * fade.y;

          vec4 col = texture2D(uPalette, vec2(clamp(dithered, 0.05, 0.98), 0.5));
          float alpha = smoothstep(0.01, 0.6, dithered) * 0.92;

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
        uPatternDensity: { value: this.options.patternDensity },
        uPixelJitter: { value: this.options.pixelSizeJitter },
        uSpeed: { value: this.options.speed },
        uEdgeFade: { value: this.options.edgeFade },
        uEnableRipples: { value: this.options.enableRipples },
        uRippleSpeed: { value: this.options.rippleSpeed },
        uRippleThickness: { value: this.options.rippleThickness },
        uRippleIntensityScale: { value: this.options.rippleIntensityScale },
        uRipples: { value: this.ripples },
        uRippleTimes: { value: this.rippleTimes },
        uRippleIntensities: { value: this.rippleIntensities },
        uLiquid: { value: this.options.liquid },
        uLiquidStrength: { value: this.options.liquidStrength },
        uLiquidRadius: { value: this.options.liquidRadius },
        uLiquidWobbleSpeed: { value: this.options.liquidWobbleSpeed },
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

  private addRipple(x: number, y: number, intensity: number = 1.5) {
    if (!this.options.enableRipples) return;
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

    if (Math.random() < 0.35) {
      this.addRipple(x, y, 0.8 + Math.random() * 0.7);
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

    for (let i = 0; i < 4; i++) {
      this.addRipple(x + (Math.random() - 0.5) * 0.06, y + (Math.random() - 0.5) * 0.06, 1.8);
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
