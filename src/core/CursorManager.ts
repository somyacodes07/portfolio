/**
 * CursorManager — two-layer cursor system
 *
 *  #cursor-dot   — inner sharp dot, follows mouse instantly via rAF
 *  #cursor-ring  — outer ring, follows with a smooth lerp lag
 *
 * States
 *  default  — dot visible, ring is a circle
 *  hover    — dot fades, ring expands to a rounded square with corner brackets
 *  text     — both hidden (native caret inside inputs)
 *  click    — brief scale pulse on both layers
 *  hidden   — mouse left the viewport
 */

const HOVER_SELECTORS = [
  'a',
  'button',
  '[role="button"]',
  'label',
  '.action-btn',
  '.clickable',
  '.window-control',
  '.explorer-item',
  '.certificate-card',
  '.project-card',
].join(', ');

const TEXT_SELECTORS = 'input, textarea, [contenteditable="true"]';

/** Linear interpolation */
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

class CursorManager {
  private dot:  HTMLDivElement;
  private ring: HTMLDivElement;

  // Dot — instantaneous position
  private dotX  = -200;
  private dotY  = -200;

  // Ring — lagged lerp position
  private ringX = -200;
  private ringY = -200;

  // Target (mouse position)
  private targetX = -200;
  private targetY = -200;

  private state: 'default' | 'hover' | 'text' = 'default';
  private isHidden = false;
  private clickTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.dot  = this.make('cursor-dot');
    this.ring = this.make('cursor-ring');
    document.body.appendChild(this.dot);
    document.body.appendChild(this.ring);
    this.bindEvents();
    this.loop();
  }

  // ── DOM ─────────────────────────────────────────────────────

  private make(id: string): HTMLDivElement {
    const el = document.createElement('div');
    el.id = id;
    return el;
  }

  // ── Event binding ────────────────────────────────────────────

  private bindEvents(): void {
    document.addEventListener('mousemove', (e) => {
      this.targetX = e.clientX;
      this.targetY = e.clientY;
      if (this.isHidden) {
        // Snap ring to mouse position so it doesn't slide in from (-200,-200)
        this.ringX = e.clientX;
        this.ringY = e.clientY;
        this.setHidden(false);
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => this.setHidden(true));
    document.addEventListener('mouseenter', () => this.setHidden(false));

    document.addEventListener('mouseover', (e) => {
      const target = e.target as Element | null;
      if (!target) return;

      if (target.closest(TEXT_SELECTORS)) {
        this.applyState('text');
      } else if (target.closest(HOVER_SELECTORS)) {
        this.applyState('hover');
      } else {
        this.applyState('default');
      }
    }, { passive: true });

    document.addEventListener('mousedown', () => this.triggerClick());
  }

  // ── State helpers ────────────────────────────────────────────

  private applyState(next: 'default' | 'hover' | 'text'): void {
    if (this.state === next) return;
    this.state = next;

    this.dot.classList.remove('cursor-hover', 'cursor-text');
    this.ring.classList.remove('cursor-hover', 'cursor-text');

    if (next === 'hover') {
      this.dot.classList.add('cursor-hover');
      this.ring.classList.add('cursor-hover');
    } else if (next === 'text') {
      this.dot.classList.add('cursor-text');
      this.ring.classList.add('cursor-text');
    }
  }

  private setHidden(hidden: boolean): void {
    this.isHidden = hidden;
    this.dot.classList.toggle('cursor-hidden', hidden);
    this.ring.classList.toggle('cursor-hidden', hidden);
  }

  private triggerClick(): void {
    // Remove then re-add class to re-trigger animation
    if (this.clickTimeout) clearTimeout(this.clickTimeout);
    this.dot.classList.remove('cursor-click');
    this.ring.classList.remove('cursor-click');

    // Force reflow so the class removal takes effect before re-adding
    void this.dot.offsetWidth;

    this.dot.classList.add('cursor-click');
    this.ring.classList.add('cursor-click');

    this.clickTimeout = setTimeout(() => {
      this.dot.classList.remove('cursor-click');
      this.ring.classList.remove('cursor-click');
    }, 260);
  }

  // ── Animation loop ───────────────────────────────────────────

  private loop(): void {
    requestAnimationFrame(() => {
      // Dot: instant
      this.dotX = this.targetX;
      this.dotY = this.targetY;

      // Ring: lerp — tweak the factor for more/less lag (0.12 = more lag, 0.2 = snappier)
      const LERP = 0.14;
      this.ringX = lerp(this.ringX, this.targetX, LERP);
      this.ringY = lerp(this.ringY, this.targetY, LERP);

      // Commit to DOM
      this.dot.style.left  = `${this.dotX}px`;
      this.dot.style.top   = `${this.dotY}px`;
      this.ring.style.left = `${this.ringX}px`;
      this.ring.style.top  = `${this.ringY}px`;

      this.loop();
    });
  }
}

let instance: CursorManager | null = null;

export const initCursor = (): void => {
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
  if (instance) return;
  instance = new CursorManager();
};
