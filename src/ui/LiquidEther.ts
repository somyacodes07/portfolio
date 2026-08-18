import * as THREE from 'three';

export interface LiquidEtherOptions {
  colors?: string[];
  mouseForce?: number;
  cursorSize?: number;
  autoDemo?: boolean;
  autoSpeed?: number;
  resolution?: number;
}

export class LiquidEther {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;

  private simRes: THREE.Vector2 = new THREE.Vector2();
  private texelSize: THREE.Vector2 = new THREE.Vector2();
  private aspect: number = 1;

  // FBOs (Ping-pong double buffers)
  private velocity: { read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget };
  private density: { read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget };
  private divergence: THREE.WebGLRenderTarget;
  private pressure: { read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget };

  // Shaders
  private advectMaterial: THREE.ShaderMaterial;
  private splatMaterial: THREE.ShaderMaterial;
  private divergenceMaterial: THREE.ShaderMaterial;
  private pressureMaterial: THREE.ShaderMaterial;
  private gradientSubtractMaterial: THREE.ShaderMaterial;
  private displayMaterial: THREE.ShaderMaterial;

  private paletteTexture: THREE.DataTexture;

  // Mouse & Motion tracking
  private mouse: THREE.Vector2 = new THREE.Vector2(-1, -1);
  private prevMouse: THREE.Vector2 = new THREE.Vector2(-1, -1);
  private mouseVel: THREE.Vector2 = new THREE.Vector2(0, 0);
  private lastMoveTime: number = performance.now();

  // Settings
  private options: Required<LiquidEtherOptions>;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement, options: LiquidEtherOptions = {}) {
    this.container = container;
    this.options = {
      colors: options.colors || ['#3B82F6', '#8B5CF6', '#06B6D4', '#6366F1', '#38BDF8'],
      mouseForce: options.mouseForce ?? 14,
      cursorSize: options.cursorSize ?? 140,
      autoDemo: options.autoDemo ?? true,
      autoSpeed: options.autoSpeed ?? 0.35,
      resolution: options.resolution ?? 0.5,
    };

    // Set container styles
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';
    this.container.style.pointerEvents = 'none';

    // 1. Setup Three.js Renderer
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

    // 2. Setup Scene & Orthographic Camera
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

    this.quad = new THREE.Mesh(geometry);
    this.scene.add(this.quad);

    // 3. Create Palette Texture
    this.paletteTexture = this.createPaletteTexture(this.options.colors);

    // 4. Calculate Resolution & Texel Size
    const width = Math.floor(this.container.clientWidth * this.options.resolution);
    const height = Math.floor(this.container.clientHeight * this.options.resolution);
    this.simRes.set(width, height);
    this.texelSize.set(1 / width, 1 / height);
    this.aspect = this.container.clientWidth / this.container.clientHeight;

    // 5. Create Ping-Pong Render Targets
    const rtOptions: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    };

    this.velocity = {
      read: new THREE.WebGLRenderTarget(width, height, rtOptions),
      write: new THREE.WebGLRenderTarget(width, height, rtOptions),
    };
    this.density = {
      read: new THREE.WebGLRenderTarget(width, height, rtOptions),
      write: new THREE.WebGLRenderTarget(width, height, rtOptions),
    };
    this.divergence = new THREE.WebGLRenderTarget(width, height, rtOptions);
    this.pressure = {
      read: new THREE.WebGLRenderTarget(width, height, rtOptions),
      write: new THREE.WebGLRenderTarget(width, height, rtOptions),
    };

    // 6. Build Materials / Shaders
    const baseVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    // Advection Shader - using faster dissipation (0.92) for elegant fluid dissipation
    this.advectMaterial = new THREE.ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: `
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 uTexelSize;
        uniform float uDt;
        uniform float uDissipation;
        varying vec2 vUv;
        void main() {
          vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
          gl_FragColor = uDissipation * texture2D(uSource, coord);
        }
      `,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        uTexelSize: { value: this.texelSize },
        uDt: { value: 0.016 },
        uDissipation: { value: 0.92 },
      },
      depthWrite: false,
      depthTest: false,
    });

    // Splat / Injection Shader
    this.splatMaterial = new THREE.ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: `
        uniform sampler2D uTarget;
        uniform vec2 uPoint;
        uniform vec3 uColor;
        uniform float uRadius;
        uniform float uAspect;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - uPoint;
          p.x *= uAspect;
          vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
        }
      `,
      uniforms: {
        uTarget: { value: null },
        uPoint: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Vector3() },
        uRadius: { value: 0.001 },
        uAspect: { value: this.aspect },
      },
      depthWrite: false,
      depthTest: false,
    });

    // Divergence Shader
    this.divergenceMaterial = new THREE.ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: `
        uniform sampler2D uVelocity;
        uniform vec2 uTexelSize;
        varying vec2 vUv;
        void main() {
          float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
          float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
          float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
          float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
          float div = 0.5 * (R - L + T - B);
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: this.texelSize },
      },
      depthWrite: false,
      depthTest: false,
    });

    // Pressure Jacobi Shader
    this.pressureMaterial = new THREE.ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: `
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        uniform vec2 uTexelSize;
        varying vec2 vUv;
        void main() {
          float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
          float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
          float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
          float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
          float div = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + T + B - div) * 0.25;
          gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {
        uPressure: { value: null },
        uDivergence: { value: null },
        uTexelSize: { value: this.texelSize },
      },
      depthWrite: false,
      depthTest: false,
    });

    // Gradient Subtract Shader
    this.gradientSubtractMaterial = new THREE.ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: `
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        uniform vec2 uTexelSize;
        varying vec2 vUv;
        void main() {
          float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
          float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
          float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
          float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity -= vec2(R - L, T - B) * 0.5;
          gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `,
      uniforms: {
        uPressure: { value: null },
        uVelocity: { value: null },
        uTexelSize: { value: this.texelSize },
      },
      depthWrite: false,
      depthTest: false,
    });

    // Output Display Shader - tuned opacity and soft glow blending
    this.displayMaterial = new THREE.ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: `
        uniform sampler2D uDensity;
        uniform sampler2D uPalette;
        varying vec2 vUv;
        void main() {
          vec4 d = texture2D(uDensity, vUv);
          float intensity = length(d.rgb);
          vec4 col = texture2D(uPalette, vec2(clamp(intensity, 0.0, 0.99), 0.5));
          float alpha = smoothstep(0.02, 0.85, intensity) * 0.42;
          gl_FragColor = vec4(col.rgb, alpha);
        }
      `,
      uniforms: {
        uDensity: { value: null },
        uPalette: { value: this.paletteTexture },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    // Bind Event Listeners
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('mousemove', this.onPointerMove, { passive: true });
    window.addEventListener('touchmove', this.onPointerMove, { passive: true });
    window.addEventListener('mousedown', this.onPointerDown, { passive: true });
    window.addEventListener('touchstart', this.onPointerDown, { passive: true });

    // Initial Splash (subtle ambient start)
    const c = new THREE.Color(this.options.colors[0]);
    this.splat(0.5, 0.5, 0.8, 0.4, new THREE.Vector3(c.r, c.g, c.b));

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

  private swap(target: { read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget }) {
    const temp = target.read;
    target.read = target.write;
    target.write = temp;
  }

  private renderPass(target: THREE.WebGLRenderTarget, material: THREE.ShaderMaterial) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  private splat(x: number, y: number, dx: number, dy: number, color: THREE.Vector3) {
    const radius = (this.options.cursorSize / 10000) / this.options.resolution;

    // Add Velocity
    this.splatMaterial.uniforms.uTarget.value = this.velocity.read.texture;
    this.splatMaterial.uniforms.uPoint.value.set(x, y);
    this.splatMaterial.uniforms.uColor.value.set(dx * this.options.mouseForce, dy * this.options.mouseForce, 0);
    this.splatMaterial.uniforms.uRadius.value = radius;
    this.splatMaterial.uniforms.uAspect.value = this.aspect;
    this.renderPass(this.velocity.write, this.splatMaterial);
    this.swap(this.velocity);

    // Add Density / Color
    this.splatMaterial.uniforms.uTarget.value = this.density.read.texture;
    this.splatMaterial.uniforms.uColor.value.copy(color);
    this.renderPass(this.density.write, this.splatMaterial);
    this.swap(this.density);
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

    if (this.prevMouse.x < 0) {
      this.prevMouse.set(x, y);
    } else {
      this.prevMouse.copy(this.mouse);
    }
    this.mouse.set(x, y);

    this.mouseVel.subVectors(this.mouse, this.prevMouse);
    this.lastMoveTime = performance.now();

    if (this.mouseVel.lengthSq() > 0.000001) {
      const colIndex = Math.floor(Math.random() * this.options.colors.length);
      const c = new THREE.Color(this.options.colors[colIndex]);
      this.splat(x, y, this.mouseVel.x * 12, this.mouseVel.y * 12, new THREE.Vector3(c.r * 0.8, c.g * 0.8, c.b * 0.8));
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
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.8;
      const c = new THREE.Color(this.options.colors[i % this.options.colors.length]);
      this.splat(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, new THREE.Vector3(c.r, c.g, c.b));
    }
  }

  private onWindowResize() {
    if (!this.container) return;
    const width = Math.floor(this.container.clientWidth * this.options.resolution);
    const height = Math.floor(this.container.clientHeight * this.options.resolution);

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.simRes.set(width, height);
    this.texelSize.set(1 / width, 1 / height);
    this.aspect = this.container.clientWidth / this.container.clientHeight;

    this.velocity.read.setSize(width, height);
    this.velocity.write.setSize(width, height);
    this.density.read.setSize(width, height);
    this.density.write.setSize(width, height);
    this.divergence.setSize(width, height);
    this.pressure.read.setSize(width, height);
    this.pressure.write.setSize(width, height);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (!this.isRunning) return;

      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      // Gentle ambient floating motion when idle
      if (this.options.autoDemo && now - this.lastMoveTime > 1200) {
        const time = now * 0.001 * this.options.autoSpeed;
        const ax = 0.5 + Math.sin(time * 0.5) * 0.4;
        const ay = 0.5 + Math.cos(time * 0.6) * 0.4;
        const dx = Math.cos(time * 1.5) * 0.08;
        const dy = Math.sin(time * 1.3) * 0.08;
        const c = new THREE.Color(this.options.colors[Math.floor(now * 0.0005) % this.options.colors.length]);
        this.splat(ax, ay, dx, dy, new THREE.Vector3(c.r * 0.5, c.g * 0.5, c.b * 0.5));
      }

      // 1. Advect Velocity (0.92 dissipation for natural decay)
      this.advectMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
      this.advectMaterial.uniforms.uSource.value = this.velocity.read.texture;
      this.advectMaterial.uniforms.uDt.value = dt;
      this.advectMaterial.uniforms.uDissipation.value = 0.92;
      this.renderPass(this.velocity.write, this.advectMaterial);
      this.swap(this.velocity);

      // 2. Advect Density / Color (0.93 dissipation)
      this.advectMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
      this.advectMaterial.uniforms.uSource.value = this.density.read.texture;
      this.advectMaterial.uniforms.uDissipation.value = 0.93;
      this.renderPass(this.density.write, this.advectMaterial);
      this.swap(this.density);

      // 3. Compute Divergence
      this.divergenceMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
      this.renderPass(this.divergence, this.divergenceMaterial);

      // 4. Pressure Jacobi Iterations
      this.pressureMaterial.uniforms.uDivergence.value = this.divergence.texture;
      for (let i = 0; i < 18; i++) {
        this.pressureMaterial.uniforms.uPressure.value = this.pressure.read.texture;
        this.renderPass(this.pressure.write, this.pressureMaterial);
        this.swap(this.pressure);
      }

      // 5. Subtract Pressure Gradient
      this.gradientSubtractMaterial.uniforms.uPressure.value = this.pressure.read.texture;
      this.gradientSubtractMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
      this.renderPass(this.velocity.write, this.gradientSubtractMaterial);
      this.swap(this.velocity);

      // 6. Display Output to Screen
      this.displayMaterial.uniforms.uDensity.value = this.density.read.texture;
      this.quad.material = this.displayMaterial;
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public setColors(colors: string[]) {
    if (!colors || colors.length === 0) return;
    this.options.colors = colors;
    if (this.paletteTexture) {
      this.paletteTexture.dispose();
    }
    this.paletteTexture = this.createPaletteTexture(colors);
    this.displayMaterial.uniforms.uPalette.value = this.paletteTexture;
    this.displayMaterial.uniforms.uPalette.value.needsUpdate = true;
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

    this.velocity.read.dispose();
    this.velocity.write.dispose();
    this.density.read.dispose();
    this.density.write.dispose();
    this.divergence.dispose();
    this.pressure.read.dispose();
    this.pressure.write.dispose();

    this.paletteTexture.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
