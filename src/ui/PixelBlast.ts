import * as THREE from 'three';
import { EffectComposer, EffectPass, RenderPass, Effect } from 'postprocessing';

export type PixelBlastVariant = 'square' | 'circle' | 'triangle' | 'diamond';

interface TouchPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  force: number;
  age: number;
}

interface TouchTexture {
  canvas: HTMLCanvasElement;
  texture: THREE.Texture;
  addTouch: (norm: { x: number; y: number }) => void;
  update: () => void;
  radiusScale: number;
  size: number;
}

export interface PixelBlastOptions {
  variant?: PixelBlastVariant;
  pixelSize?: number;
  color?: string;
  colors?: string[];
  antialias?: boolean;
  patternScale?: number;
  patternDensity?: number;
  liquid?: boolean;
  liquidStrength?: number;
  liquidRadius?: number;
  pixelSizeJitter?: number;
  enableRipples?: boolean;
  rippleIntensityScale?: number;
  rippleThickness?: number;
  rippleSpeed?: number;
  liquidWobbleSpeed?: number;
  speed?: number;
  transparent?: boolean;
  edgeFade?: number;
  noiseAmount?: number;
}

const createTouchTexture = (): TouchTexture => {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const trail: TouchPoint[] = [];
  let last: { x: number; y: number } | null = null;
  const maxAge = 64;
  let radius = 0.1 * size;
  const speed = 1 / maxAge;
  const clear = () => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  const drawPoint = (p: TouchPoint) => {
    const pos = { x: p.x * size, y: (1 - p.y) * size };
    let intensity = 1;
    const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);
    const easeOutQuad = (t: number) => -t * (t - 2);
    if (p.age < maxAge * 0.3) intensity = easeOutSine(p.age / (maxAge * 0.3));
    else intensity = easeOutQuad(1 - (p.age - maxAge * 0.3) / (maxAge * 0.7)) || 0;
    intensity *= p.force;
    const color = `${((p.vx + 1) / 2) * 255}, ${((p.vy + 1) / 2) * 255}, ${intensity * 255}`;
    const offset = size * 5;
    ctx.shadowOffsetX = offset;
    ctx.shadowOffsetY = offset;
    ctx.shadowBlur = radius;
    ctx.shadowColor = `rgba(${color},${0.22 * intensity})`;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,0,0,1)';
    ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  const addTouch = (norm: { x: number; y: number }) => {
    let force = 0;
    let vx = 0;
    let vy = 0;
    if (last) {
      const dx = norm.x - last.x;
      const dy = norm.y - last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy;
      const d = Math.sqrt(dd);
      vx = dx / (d || 1);
      vy = dy / (d || 1);
      force = Math.min(dd * 10000, 1);
    }
    last = { x: norm.x, y: norm.y };
    trail.push({ x: norm.x, y: norm.y, age: 0, force, vx, vy });
  };
  const update = () => {
    clear();
    for (let i = trail.length - 1; i >= 0; i--) {
      const point = trail[i];
      const f = point.force * speed * (1 - point.age / maxAge);
      point.x += point.vx * f;
      point.y += point.vy * f;
      point.age++;
      if (point.age > maxAge) trail.splice(i, 1);
    }
    for (let i = 0; i < trail.length; i++) drawPoint(trail[i]);
    texture.needsUpdate = true;
  };
  return {
    canvas,
    texture,
    addTouch,
    update,
    set radiusScale(v: number) {
      radius = 0.1 * size * v;
    },
    get radiusScale() {
      return radius / (0.1 * size);
    },
    size
  };
};

const createLiquidEffect = (texture: THREE.Texture, opts?: { strength?: number; freq?: number }) => {
  const fragment = `
    uniform sampler2D uTexture;
    uniform float uStrength;
    uniform float uTime;
    uniform float uFreq;

    void mainUv(inout vec2 uv) {
      vec4 tex = texture2D(uTexture, uv);
      float vx = tex.r * 2.0 - 1.0;
      float vy = tex.g * 2.0 - 1.0;
      float intensity = tex.b;

      float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);

      float amt = uStrength * intensity * wave;

      uv += vec2(vx, vy) * amt;
    }
    `;
  return new Effect('LiquidEffect', fragment, {
    uniforms: new Map<string, THREE.Uniform>([
      ['uTexture', new THREE.Uniform(texture)],
      ['uStrength', new THREE.Uniform(opts?.strength ?? 0.025)],
      ['uTime', new THREE.Uniform(0)],
      ['uFreq', new THREE.Uniform(opts?.freq ?? 4.5)]
    ])
  });
};

const SHAPE_MAP: Record<PixelBlastVariant, number> = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3
};

const VERTEX_SRC = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SRC = `
precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;

uniform int   uShapeType;
const int SHAPE_SQUARE   = 0;
const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;

const int   MAX_CLICKS = 10;

uniform vec2  uClickPos  [MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

#define FBM_OCTAVES     5
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.0

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= FBM_LACUNARITY;
    amp  *= FBM_GAIN;
  }
  return sum * 0.5 + 0.5;
}

float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;

  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fract(fragCoord / pixelSize);

  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;

  float feed = base + (uDensity - 0.5) * 0.3;

  float speed     = uRippleSpeed;
  float thickness = uRippleThickness;
  const float dampT     = 1.0;
  const float dampR     = 10.0;

  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      float cellPixelSize = 8.0 * pixelSize;
      vec2 cuv = (((pos - uResolution * .5 - cellPixelSize * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = speed * t;
      float ring  = exp(-pow((r - waveR) / thickness, 2.0));
      float atten = exp(-dampT * t) * exp(-dampR * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);

  float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
  float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
  float coverage = bw * jitterScale;
  float M;
  if      (uShapeType == SHAPE_CIRCLE)   M = maskCircle (pixelUV, coverage);
  else if (uShapeType == SHAPE_TRIANGLE) M = maskTriangle(pixelUV, pixelId, coverage);
  else if (uShapeType == SHAPE_DIAMOND)  M = maskDiamond(pixelUV, coverage);
  else                                   M = coverage;

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    M *= fade;
  }

  vec3 color = uColor;

  // sRGB gamma correction
  vec3 srgbColor = mix(
    color * 12.92,
    1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, color)
  );

  fragColor = vec4(srgbColor, M);
}
`;

const MAX_CLICKS = 10;

export class PixelBlast {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private material: THREE.ShaderMaterial;
  private uniforms: any;
  private clock: THREE.Clock;
  private clickIx: number = 0;
  private timeOffset: number = Math.random() * 1000;
  private composer?: EffectComposer;
  private touch?: TouchTexture;
  private liquidEffect?: Effect;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private resizeObserver?: ResizeObserver;

  private options: Required<PixelBlastOptions>;

  constructor(container: HTMLElement, options: PixelBlastOptions = {}) {
    this.container = container;
    const initialColor = options.color || (options.colors && options.colors[0]) || '#B497CF';
    this.options = {
      variant: options.variant || 'square',
      pixelSize: options.pixelSize ?? 4,
      color: initialColor,
      colors: options.colors || [initialColor],
      antialias: options.antialias ?? true,
      patternScale: options.patternScale ?? 2.0,
      patternDensity: options.patternDensity ?? 1.0,
      liquid: options.liquid ?? false,
      liquidStrength: options.liquidStrength ?? 0.12,
      liquidRadius: options.liquidRadius ?? 1.2,
      pixelSizeJitter: options.pixelSizeJitter ?? 0.0,
      enableRipples: options.enableRipples ?? true,
      rippleIntensityScale: options.rippleIntensityScale ?? 1.5,
      rippleThickness: options.rippleThickness ?? 0.12,
      rippleSpeed: options.rippleSpeed ?? 0.4,
      liquidWobbleSpeed: options.liquidWobbleSpeed ?? 5.0,
      speed: options.speed ?? 0.5,
      transparent: options.transparent ?? true,
      edgeFade: options.edgeFade ?? 0.25,
      noiseAmount: options.noiseAmount ?? 0,
    };

    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';
    this.container.style.pointerEvents = 'none';

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.transparent,
      powerPreference: 'high-performance',
    });
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    if (this.options.transparent) {
      this.renderer.setClearAlpha(0);
    } else {
      this.renderer.setClearColor(0x000000, 1);
    }

    // 2. Uniforms
    this.uniforms = {
      uResolution: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(this.options.color) },
      uClickPos: {
        value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)),
      },
      uClickTimes: { value: new Float32Array(MAX_CLICKS) },
      uShapeType: { value: SHAPE_MAP[this.options.variant] ?? 0 },
      uPixelSize: { value: this.options.pixelSize * this.renderer.getPixelRatio() },
      uScale: { value: this.options.patternScale },
      uDensity: { value: this.options.patternDensity },
      uPixelJitter: { value: this.options.pixelSizeJitter },
      uEnableRipples: { value: this.options.enableRipples ? 1 : 0 },
      uRippleSpeed: { value: this.options.rippleSpeed },
      uRippleThickness: { value: this.options.rippleThickness },
      uRippleIntensity: { value: this.options.rippleIntensityScale },
      uEdgeFade: { value: this.options.edgeFade },
    };

    // 3. Scene & Quad
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SRC,
      fragmentShader: FRAGMENT_SRC,
      uniforms: this.uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      glslVersion: THREE.GLSL3,
    });

    const quadGeom = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(quadGeom, this.material);
    this.scene.add(this.quad);
    this.clock = new THREE.Clock();

    // 4. Postprocessing Liquid / Noise Effects
    if (this.options.liquid) {
      this.touch = createTouchTexture();
      this.touch.radiusScale = this.options.liquidRadius;
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.liquidEffect = createLiquidEffect(this.touch.texture, {
        strength: this.options.liquidStrength,
        freq: this.options.liquidWobbleSpeed,
      });
      const effectPass = new EffectPass(this.camera, this.liquidEffect);
      effectPass.renderToScreen = true;
      this.composer.addPass(renderPass);
      this.composer.addPass(effectPass);
    }

    if (this.options.noiseAmount > 0) {
      if (!this.composer) {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
      }
      const noiseEffect = new Effect(
        'NoiseEffect',
        `uniform float uTime; uniform float uAmount; float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);} void mainUv(inout vec2 uv){} void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){ float n=hash(floor(uv*vec2(1920.0,1080.0))+floor(uTime*60.0)); float g=(n-0.5)*uAmount; outputColor=inputColor+vec4(vec3(g),0.0);} `,
        {
          uniforms: new Map<string, THREE.Uniform>([
            ['uTime', new THREE.Uniform(0)],
            ['uAmount', new THREE.Uniform(this.options.noiseAmount)],
          ]),
        }
      );
      const noisePass = new EffectPass(this.camera, noiseEffect);
      noisePass.renderToScreen = true;
      if (this.composer && this.composer.passes.length > 0) {
        this.composer.passes.forEach((p) => {
          (p as any).renderToScreen = false;
        });
      }
      this.composer.addPass(noisePass);
    }

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    // Event binding
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);

    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });

    this.start();
  }

  private resize() {
    if (!this.container) return;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.uniforms.uResolution.value.set(this.renderer.domElement.width, this.renderer.domElement.height);
    if (this.composer) {
      this.composer.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
    }
    this.uniforms.uPixelSize.value = this.options.pixelSize * this.renderer.getPixelRatio();
  }

  public setColors(colors: string[] | string) {
    let mainColor = '#B497CF';
    if (Array.isArray(colors) && colors.length > 0) {
      mainColor = colors[0];
    } else if (typeof colors === 'string') {
      mainColor = colors;
    }
    this.options.color = mainColor;
    this.uniforms.uColor.value.set(mainColor);
  }

  private mapToPixels(e: MouseEvent | PointerEvent | Touch) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const scaleX = this.renderer.domElement.width / rect.width;
    const scaleY = this.renderer.domElement.height / rect.height;
    const fx = (e.clientX - rect.left) * scaleX;
    const fy = (rect.height - (e.clientY - rect.top)) * scaleY;
    return {
      fx,
      fy,
      w: this.renderer.domElement.width,
      h: this.renderer.domElement.height,
    };
  }

  private onPointerDown(e: PointerEvent) {
    const { fx, fy } = this.mapToPixels(e);
    const ix = this.clickIx;
    this.uniforms.uClickPos.value[ix].set(fx, fy);
    this.uniforms.uClickTimes.value[ix] = this.uniforms.uTime.value;
    this.clickIx = (ix + 1) % MAX_CLICKS;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.touch) return;
    const { fx, fy, w, h } = this.mapToPixels(e);
    this.touch.addTouch({ x: fx / w, y: fy / h });
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const animate = () => {
      if (!this.isRunning) return;

      this.uniforms.uTime.value = this.timeOffset + this.clock.getElapsedTime() * this.options.speed;

      if (this.liquidEffect) {
        const timeUniform = (this.liquidEffect as any).uniforms.get('uTime');
        if (timeUniform) timeUniform.value = this.uniforms.uTime.value;
      }

      if (this.composer) {
        if (this.touch) this.touch.update();
        this.composer.passes.forEach((p) => {
          const pass = p as any;
          if (pass.effects) {
            pass.effects.forEach((eff: any) => {
              const timeUniform = eff.uniforms?.get('uTime');
              if (timeUniform) timeUniform.value = this.uniforms.uTime.value;
            });
          }
        });
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
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

    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);

    this.resizeObserver?.disconnect();
    this.quad.geometry.dispose();
    this.material.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
