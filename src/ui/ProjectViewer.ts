import { WindowManager, WindowAction, WindowOptions } from '../core/WindowManager';
import { sanitizeUrl } from '../core/Utils';
import command from '../../config.json';

interface ProjectMeta {
    stack: string[];
    year: string;
    status: string;
}

interface RawProjectMeta {
    stack?: string[] | string;
    year?: string | number;
    status?: string;
}

export class ProjectViewer {
    private windowManager: WindowManager;

    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager;
    }

    private isHttpUrl(value: string): boolean {
        return /^https?:\/\//i.test(value);
    }

    public openProjectWindow(title: string, link: string, videoUrl?: string, screenshots?: string[], liveLink?: string) {
        const safeLink = sanitizeUrl(link, { allowRelative: false });
        if (!safeLink) {
            console.error('Blocked insecure or invalid project link:', link);
            return;
        }

        const actions: WindowAction[] = [];
        if (liveLink) {
            actions.push({
                label: 'Live',
                link: liveLink,
                icon: 'fa-solid fa-earth-americas'
            });
        }

        if (window.innerWidth <= 600) {
            window.open(safeLink, '_blank', 'noopener,noreferrer');
            return;
        }

        const mediaItems: { type: 'video' | 'image'; src: string }[] = [];

        if (videoUrl) {
            const safeVideo = sanitizeUrl(videoUrl, { allowRelative: true });
            if (safeVideo) {
                mediaItems.push({ type: 'video', src: safeVideo });
            }
        }

        if (screenshots && Array.isArray(screenshots)) {
            screenshots.forEach((src) => {
                const safeSrc = sanitizeUrl(String(src), { allowRelative: true });
                if (!safeSrc) return;
                const isVideo = src.toLowerCase().endsWith('.mp4') || src.toLowerCase().endsWith('.webm');
                mediaItems.push({
                    type: isVideo ? 'video' : 'image',
                    src: safeSrc
                });
            });
        }

        if (mediaItems.length === 0) {
            const iframeValue = document.createElement('iframe');
            iframeValue.src = safeLink;
            iframeValue.style.width = '100%';
            iframeValue.style.height = '100%';
            iframeValue.style.border = 'none';
            this.windowManager.open(`proj-${title}`, title, iframeValue, { actions });
            return;
        }

        const galleryContainer = document.createElement('div');
        galleryContainer.className = 'gallery-container';
        galleryContainer.tabIndex = 0;
        galleryContainer.setAttribute('role', 'region');
        galleryContainer.setAttribute('aria-label', `${title} media gallery`);

        mediaItems.forEach((item, index) => {
            let element: HTMLElement;
            if (item.type === 'video') {
                const video = document.createElement('video');
                video.src = item.src;
                video.className = 'gallery-slide';
                video.controls = true;
                video.loop = true;
                element = video;
            } else {
                const img = document.createElement('img');
                img.src = item.src;
                img.className = 'gallery-slide';
                img.alt = `${title} preview ${index + 1}`;
                element = img;
            }

            if (index === 0) element.classList.add('active');
            galleryContainer.appendChild(element);
        });

        let currentIndex = 0;
        const counter = document.createElement('div');
        counter.className = 'gallery-counter';
        galleryContainer.appendChild(counter);

        const updateCounter = (index: number) => {
            counter.textContent = `${index + 1}/${mediaItems.length}`;
        };

        const showSlide = (index: number) => {
            const slides = galleryContainer.querySelectorAll('.gallery-slide');
            slides.forEach((slide, i) => {
                if (i === index) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                    if (slide instanceof HTMLVideoElement) {
                        slide.pause();
                    }
                }
            });
            updateCounter(index);
        };

        const nextSlide = () => {
            currentIndex = (currentIndex + 1) % mediaItems.length;
            showSlide(currentIndex);
        };

        const prevSlide = () => {
            currentIndex = (currentIndex - 1 + mediaItems.length) % mediaItems.length;
            showSlide(currentIndex);
        };

        if (mediaItems.length > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'gallery-nav gallery-prev';
            prevBtn.innerHTML = '&#10094;';
            prevBtn.setAttribute('aria-label', 'Previous media');
            prevBtn.onclick = (e) => {
                e.stopPropagation();
                prevSlide();
            };

            const nextBtn = document.createElement('button');
            nextBtn.className = 'gallery-nav gallery-next';
            nextBtn.innerHTML = '&#10095;';
            nextBtn.setAttribute('aria-label', 'Next media');
            nextBtn.onclick = (e) => {
                e.stopPropagation();
                nextSlide();
            };

            galleryContainer.appendChild(prevBtn);
            galleryContainer.appendChild(nextBtn);

            galleryContainer.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    nextSlide();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    prevSlide();
                }
            });

            let pointerStartX: number | null = null;

            galleryContainer.addEventListener('pointerdown', (e: PointerEvent) => {
                pointerStartX = e.clientX;
            });

            galleryContainer.addEventListener('pointerup', (e: PointerEvent) => {
                if (pointerStartX === null) return;
                const deltaX = e.clientX - pointerStartX;
                pointerStartX = null;

                if (Math.abs(deltaX) < 35) return;
                if (deltaX < 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            });

            galleryContainer.addEventListener('pointercancel', () => {
                pointerStartX = null;
            });
        }

        showSlide(currentIndex);

        this.windowManager.open(`proj-${title}`, title, galleryContainer, { actions });
        requestAnimationFrame(() => {
            galleryContainer.focus();
        });
    }

    private normalizeProjectMeta(rawMeta: unknown, description: string): ProjectMeta {
        const candidate = rawMeta as RawProjectMeta | null;

        let stack: string[] = [];
        if (candidate && Array.isArray(candidate.stack)) {
            stack = candidate.stack
                .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                .map((item) => item.trim())
                .slice(0, 3);
        } else if (candidate && typeof candidate.stack === 'string' && candidate.stack.trim()) {
            stack = candidate.stack
                .split(',')
                .map((item) => item.trim())
                .filter((item) => item.length > 0)
                .slice(0, 3);
        }

        if (stack.length === 0) {
            stack = this.inferStackFromDescription(description);
        }

        const yearValue = candidate?.year;
        const year = typeof yearValue === 'number'
            ? String(yearValue)
            : typeof yearValue === 'string' && yearValue.trim().length > 0
                ? yearValue.trim()
                : String(new Date().getFullYear());

        const status = typeof candidate?.status === 'string' && candidate.status.trim().length > 0
            ? candidate.status.trim()
            : 'Completed';

        return {
            stack,
            year,
            status
        };
    }

    private inferStackFromDescription(description: string): string[] {
        const normalized = description.toLowerCase();
        const stack: string[] = [];

        const keywordMap: Array<{ key: string; label: string }> = [
            { key: 'python', label: 'Python' },
            { key: 'opencv', label: 'OpenCV' },
            { key: 'audio', label: 'Audio Processing' },
            { key: 'visual', label: 'Visualization' },
            { key: 'ar', label: 'AR' },
            { key: 'ai', label: 'AI' },
            { key: 'ml', label: 'ML' },
            { key: 'browser', label: 'Web App' },
            { key: 'storage', label: 'Storage' }
        ];

        keywordMap.forEach((entry) => {
            if (stack.length >= 3) return;
            if (normalized.includes(entry.key) && !stack.includes(entry.label)) {
                stack.push(entry.label);
            }
        });

        if (stack.length === 0) {
            stack.push('Personal Project');
        }

        return stack;
    }

    public openProjectExplorer() {
        const container = document.createElement('div');
        container.className = 'explorer-grid';

        command.projects.forEach((proj: any[]) => {
            // [Title, Desc, RepoLink, LiveLinkOrThumb, Video, Screenshots[], Meta?]
            const [rawTitle, rawDesc, rawRepoLink, rawSlot4, videoUrl, screenshots, rawMeta] = proj;

            const title = String(rawTitle ?? 'Untitled Project');
            const description = String(rawDesc ?? '');
            const slot4 = String(rawSlot4 ?? '');
            const liveLink = this.isHttpUrl(slot4) ? slot4 : '';
            const link = liveLink || String(rawRepoLink ?? '');
            const imgPath = liveLink ? null : rawSlot4;
            const video = typeof videoUrl === 'string' ? videoUrl : undefined;
            const screenshotList = Array.isArray(screenshots)
                ? screenshots.filter((src): src is string => typeof src === 'string')
                : undefined;
            const meta = this.normalizeProjectMeta(rawMeta, description);

            const item = document.createElement('div');
            item.className = 'explorer-item';
            item.tabIndex = 0;
            item.setAttribute('role', 'button');
            item.setAttribute('aria-label', `Open project ${title}`);

            const openProject = () => this.openProjectWindow(title, link, video, screenshotList, liveLink);
            item.onclick = openProject;
            item.onkeydown = (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openProject();
                }
            };

            let img: HTMLElement;
            const safeImagePath = typeof imgPath === 'string' ? sanitizeUrl(imgPath, { allowRelative: true }) : null;

            if (safeImagePath) {
                const imageElement = document.createElement('img');
                imageElement.src = safeImagePath;
                imageElement.className = 'explorer-icon';
                imageElement.alt = `${title} icon`;
                imageElement.onerror = () => {
                    const replacement = document.createElement('div');
                    replacement.className = 'explorer-icon';
                    imageElement.replaceWith(replacement);
                };
                imageElement.style.background = 'transparent';
                (imageElement.style as any).webkitMaskImage = 'none';
                imageElement.style.maskImage = 'none';

                img = imageElement;
            } else {
                const divElement = document.createElement('div');
                divElement.className = 'explorer-icon';
                img = divElement;
            }

            const label = document.createElement('span');
            label.className = 'explorer-label';
            label.innerText = title;

            const descriptionNode = document.createElement('p');
            descriptionNode.className = 'explorer-description';
            descriptionNode.innerText = description;

            const stackNode = document.createElement('div');
            stackNode.className = 'explorer-stack';
            stackNode.innerText = meta.stack.join(' / ');

            const badges = document.createElement('div');
            badges.className = 'explorer-badges';

            const yearBadge = document.createElement('span');
            yearBadge.className = 'explorer-badge';
            yearBadge.innerText = meta.year;

            const statusBadge = document.createElement('span');
            const statusClass = meta.status.toLowerCase().replace(/\s+/g, '-');
            statusBadge.className = `explorer-badge status-${statusClass}`;
            statusBadge.innerText = meta.status;

            badges.appendChild(yearBadge);
            badges.appendChild(statusBadge);

            item.appendChild(img);
            item.appendChild(label);
            item.appendChild(descriptionNode);
            item.appendChild(stackNode);
            item.appendChild(badges);

            // Action Buttons (GitHub)
            const actions = document.createElement('div');
            actions.className = 'explorer-actions';

            const repoLink = String(rawRepoLink ?? '');
            if (this.isHttpUrl(repoLink)) {
                const githubBtn = document.createElement('a');
                githubBtn.href = repoLink;
                githubBtn.target = '_blank';
                githubBtn.className = 'explorer-action-btn github';
                githubBtn.innerHTML = '<i class="fa-brands fa-github"></i> GitHub';
                githubBtn.onclick = (e) => e.stopPropagation();
                actions.appendChild(githubBtn);
            }

            if (actions.children.length > 0) {
                item.appendChild(actions);
            }

            container.appendChild(item);
        });

        this.windowManager.open('project-explorer', 'Project Explorer', container, { width: 960, height: 660 });
    }
}
