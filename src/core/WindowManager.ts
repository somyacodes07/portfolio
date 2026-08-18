export interface WindowAction {
    label: string;
    link: string;
    icon?: string;
    className?: string;
    download?: boolean | string;
}

export interface WindowOptions {
    width?: number;
    height?: number;
    actions?: WindowAction[];
}

export class WindowManager {
    private windows = new Map<string, HTMLElement>();
    private zIndexCounter = 100;
    private container: HTMLElement;

    constructor() {
        let container = document.getElementById("window-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "window-container";
            document.body.appendChild(container);
        }
        this.container = container;

        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeTopWindow();
            }
        });

        window.addEventListener("resize", () => {
            if (this.isMobile() && this.windows.size > 0) {
                Array.from(this.windows.keys()).forEach((id) => this.close(id));
            }
        });
    }

    private isMobile(): boolean {
        return window.innerWidth <= 600;
    }

    public closeTopWindow(): boolean {
        const top = this.getTopWindow();
        if (top && top.id.startsWith("window-")) {
            const id = top.id.replace("window-", "");
            this.close(id);
            return true;
        }
        return false;
    }

    public open(id: string, title: string, content: string | HTMLElement, options?: WindowOptions | number, height?: number): void {
        if (this.isMobile()) {
            return;
        }

        if (this.windows.has(id)) {
            this.bringToFront(this.windows.get(id)!);
            return;
        }

        let widthValue: number | undefined;
        let heightValue: number | undefined;
        let actions: WindowAction[] | undefined;

        if (typeof options === "number") {
            widthValue = options;
            heightValue = height;
        } else if (options) {
            widthValue = options.width;
            heightValue = options.height;
            actions = options.actions;
        }

        const win = this.createWindowDOM(id, title, content, widthValue, heightValue, actions);
        this.container.appendChild(win);
        this.windows.set(id, win);
        this.bringToFront(win);
    }

    public close(id: string): void {
        const win = this.windows.get(id);
        if (!win) return;

        const wasActive = win.classList.contains("is-active");
        win.remove();
        this.windows.delete(id);

        if (wasActive) {
            const nextTopWindow = this.getTopWindow();
            if (nextTopWindow) {
                this.setActiveWindow(nextTopWindow);
            }
        }
    }

    private bringToFront(win: HTMLElement): void {
        this.zIndexCounter++;
        win.style.zIndex = String(this.zIndexCounter);
        this.setActiveWindow(win);
    }

    private setActiveWindow(win: HTMLElement): void {
        this.windows.forEach((existingWindow) => {
            existingWindow.classList.remove("is-active");
        });
        win.classList.add("is-active");
    }

    private getTopWindow(): HTMLElement | null {
        let topWindow: HTMLElement | null = null;
        let topZIndex = -Infinity;

        this.windows.forEach((win) => {
            const currentZ = Number.parseInt(win.style.zIndex || "0", 10);
            if (currentZ >= topZIndex) {
                topZIndex = currentZ;
                topWindow = win;
            }
        });

        return topWindow;
    }

    private createWindowDOM(
        id: string,
        title: string,
        content: string | HTMLElement,
        width?: number,
        height?: number,
        actions?: WindowAction[]
    ): HTMLElement {
        const win = document.createElement("div");
        win.className = "desktop-window";
        win.id = `window-${id}`;

        const targetWidth = width || 700;
        const targetHeight = height || 480;

        const safeWidth = Math.min(targetWidth, Math.max(320, window.innerWidth - 20));
        const safeHeight = Math.min(targetHeight, Math.max(280, window.innerHeight - 40));

        win.style.width = `${safeWidth}px`;
        win.style.height = `${safeHeight}px`;

        const containerW = window.innerWidth;
        const containerH = window.innerHeight;

        const maxLeft = Math.max(10, containerW - safeWidth - 10);
        const maxTop = Math.max(10, containerH - safeHeight - 10);

        const baseLeft = Math.max(20, Math.floor((containerW - safeWidth) * 0.52));
        const baseTop = Math.max(20, Math.floor((containerH - safeHeight) * 0.40));
        const offset = (this.windows.size % 5) * 22;

        const finalLeft = Math.min(Math.max(20, baseLeft + offset), maxLeft);
        const finalTop = Math.min(Math.max(20, baseTop + offset), maxTop);

        win.style.left = `${finalLeft}px`;
        win.style.top = `${finalTop}px`;

        // Title bar
        const titleBar = document.createElement("div");
        titleBar.className = "window-title-bar";
        titleBar.title = "Double-click to maximize/restore";

        titleBar.addEventListener("dblclick", (e) => {
            const target = e.target as HTMLElement;
            if (target.closest("button, a")) return;
            win.classList.toggle("is-maximized");
        });

        const titleGroup = document.createElement("div");
        titleGroup.className = "window-title-group";

        const titleText = document.createElement("span");
        titleText.textContent = title;
        titleGroup.appendChild(titleText);

        if (actions && actions.length > 0) {
            actions.forEach(action => {
                const actionBtn = document.createElement("a");
                actionBtn.href = action.link;
                actionBtn.target = "_blank";
                if (action.download) {
                    if (typeof action.download === "string") {
                        actionBtn.setAttribute("download", action.download);
                    } else {
                        actionBtn.setAttribute("download", "");
                    }
                }
                actionBtn.className = `window-title-action ${action.className || ""}`;
                actionBtn.innerHTML = `${action.icon ? `<i class="${action.icon}"></i> ` : ""}${action.label}`;
                actionBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
                titleGroup.appendChild(actionBtn);
            });
        }

        const controls = document.createElement("div");
        controls.className = "window-controls";

        const closeBtn = document.createElement("button");
        closeBtn.className = "win-btn close-btn";
        closeBtn.textContent = "X";
        closeBtn.addEventListener("click", () => this.close(id));

        controls.appendChild(closeBtn);
        titleBar.appendChild(titleGroup);
        titleBar.appendChild(controls);

        // Content
        const contentArea = document.createElement("div");
        contentArea.className = "window-content";

        if (typeof content === "string") {
            contentArea.innerHTML = content;
        } else {
            contentArea.appendChild(content);
        }

        // Resize Handle
        const resizeHandle = document.createElement("div");
        resizeHandle.className = "resize-handle";

        win.appendChild(titleBar);
        win.appendChild(contentArea);
        win.appendChild(resizeHandle);

        this.makeDraggable(win, titleBar);
        this.makeResizable(win, resizeHandle);

        win.addEventListener("pointerdown", () => this.bringToFront(win));

        return win;
    }

    private makeDraggable(win: HTMLElement, handle: HTMLElement): void {
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        let animationFrameId: number | null = null;

        const updatePosition = () => {
            if (!isDragging) return;

            const dx = currentX - startX;
            const dy = currentY - startY;

            const maxX = window.innerWidth - win.offsetWidth;
            const maxY = window.innerHeight - win.offsetHeight;

            win.style.left = Math.max(0, Math.min(maxX, startLeft + dx)) + "px";
            win.style.top = Math.max(0, Math.min(maxY, startTop + dy)) + "px";

            animationFrameId = requestAnimationFrame(updatePosition);
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDragging) return;
            currentX = e.clientX;
            currentY = e.clientY;
        };

        const onPointerUp = () => {
            isDragging = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            document.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("pointerup", onPointerUp);
            win.style.willChange = "auto";
        };

        handle.addEventListener("pointerdown", (e: PointerEvent) => {
            e.preventDefault();

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            currentX = e.clientX;
            currentY = e.clientY;
            startLeft = win.offsetLeft;
            startTop = win.offsetTop;

            // Hint browser we are moving this
            win.style.willChange = "left, top";

            document.addEventListener("pointermove", onPointerMove);
            document.addEventListener("pointerup", onPointerUp);

            // Start the loop
            animationFrameId = requestAnimationFrame(updatePosition);
        });
    }

    private makeResizable(win: HTMLElement, handle: HTMLElement): void {
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;

        let currentX = 0;
        let currentY = 0;
        let isResizing = false;
        let animationFrameId: number | null = null;

        const updateSize = () => {
            if (!isResizing) return;

            const dx = currentX - startX;
            const dy = currentY - startY;

            // Enforce limits
            // Min: 350x300 (fits 3 icons), Max: 1000x800 (Prevents full screen takeover)
            let newWidth = Math.max(350, startWidth + dx);
            let newHeight = Math.max(300, startHeight + dy);

            // Apply Max Limits
            newWidth = Math.min(1000, newWidth);
            newHeight = Math.min(800, newHeight);

            win.style.width = `${newWidth}px`;
            win.style.height = `${newHeight}px`;

            animationFrameId = requestAnimationFrame(updateSize);
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isResizing) return;
            currentX = e.clientX;
            currentY = e.clientY;
        };

        const onPointerUp = () => {
            isResizing = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            document.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("pointerup", onPointerUp);
            win.style.willChange = "auto";
        };

        handle.addEventListener("pointerdown", (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent drag from starting if handle is clicked

            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            currentX = e.clientX;
            currentY = e.clientY;
            startWidth = win.offsetWidth;
            startHeight = win.offsetHeight;

            win.style.willChange = "width, height";

            document.addEventListener("pointermove", onPointerMove);
            document.addEventListener("pointerup", onPointerUp);

            animationFrameId = requestAnimationFrame(updateSize);
        });
    }
}
