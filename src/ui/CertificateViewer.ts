import command from '../../config.json';
import { WindowManager } from '../core/WindowManager';
import { sanitizeUrl } from '../core/Utils';

type RawCertification = {
    name?: string;
    issuer?: string;
    date?: string;
    link?: string;
    image?: string;
};

type Certification = {
    id: string;
    name: string;
    issuer: string;
    date: string;
    link: string;
    image: string;
};

export class CertificateViewer {
    private windowManager: WindowManager;

    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager;
    }

    private isMobile(): boolean {
        return window.innerWidth <= 600;
    }

    private slugify(value: string): string {
        return value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'certificate';
    }

    private getCertificates(): Certification[] {
        const config = command as unknown as { certifications?: RawCertification[] };
        if (!Array.isArray(config.certifications)) {
            return [];
        }

        return config.certifications.map((rawCert, index) => {
            const name = typeof rawCert.name === 'string' && rawCert.name.trim().length > 0
                ? rawCert.name.trim()
                : `Certificate ${index + 1}`;
            const issuer = typeof rawCert.issuer === 'string' && rawCert.issuer.trim().length > 0
                ? rawCert.issuer.trim()
                : 'Unknown Issuer';
            const date = typeof rawCert.date === 'string' ? rawCert.date.trim() : '';
            const link = typeof rawCert.link === 'string' ? rawCert.link.trim() : '';
            const image = typeof rawCert.image === 'string' ? rawCert.image.trim() : '';

            return {
                id: this.slugify(`${name}-${issuer}-${index + 1}`),
                name,
                issuer,
                date,
                link,
                image
            };
        });
    }

    private getSafeLink(cert: Certification): string | null {
        return sanitizeUrl(cert.link, { allowRelative: false });
    }

    private getSafeImage(cert: Certification): string | null {
        return sanitizeUrl(cert.image, { allowRelative: true });
    }

    private getMetaText(cert: Certification): string {
        return [cert.issuer, cert.date].filter((value) => value.length > 0).join(' • ');
    }

    public openCertificateWindow(index: number): void {
        const cert = this.getCertificates()[index];
        if (!cert) return;

        const safeImage = this.getSafeImage(cert);
        const safeLink = this.getSafeLink(cert);

        if (this.isMobile()) {
            const target = safeImage || safeLink;
            if (target) {
                window.open(target, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        const shell = document.createElement('div');
        shell.className = 'certificate-window';

        const header = document.createElement('div');
        header.className = 'certificate-window-header';

        const copy = document.createElement('div');
        copy.className = 'certificate-window-copy';

        const eyebrow = document.createElement('div');
        eyebrow.className = 'certificate-window-eyebrow';
        eyebrow.innerText = 'Verified Credential';

        const title = document.createElement('h2');
        title.className = 'certificate-window-title';
        title.innerText = cert.name;

        const meta = document.createElement('p');
        meta.className = 'certificate-window-meta';
        meta.innerText = this.getMetaText(cert) || cert.issuer;

        copy.appendChild(eyebrow);
        copy.appendChild(title);
        copy.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'certificate-window-actions';

        if (safeLink) {
            const verifyLink = document.createElement('a');
            verifyLink.className = 'certificate-window-link';
            verifyLink.href = safeLink;
            verifyLink.target = '_blank';
            verifyLink.rel = 'noopener noreferrer';
            verifyLink.innerText = 'Verify online';
            actions.appendChild(verifyLink);
        }

        header.appendChild(copy);
        header.appendChild(actions);
        shell.appendChild(header);

        const media = document.createElement('div');
        media.className = 'certificate-window-media';

        const frame = document.createElement('div');
        frame.className = 'certificate-window-frame';

        if (safeImage) {
            const img = document.createElement('img');
            img.className = 'certificate-window-image';
            img.src = safeImage;
            img.alt = `${cert.name} certificate`;
            frame.appendChild(img);
        } else {
            const empty = document.createElement('div');
            empty.className = 'certificate-window-empty';
            empty.innerText = 'Certificate image not configured.';
            frame.appendChild(empty);
        }

        media.appendChild(frame);
        shell.appendChild(media);

        this.windowManager.open(`cert-${cert.id}`, cert.name, shell, 940, 690);
    }

    public openCertificateExplorer(): void {
        if (this.isMobile()) {
            return;
        }

        const certs = this.getCertificates();
        const container = document.createElement('div');
        container.className = 'explorer-grid certificate-grid';

        if (certs.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'certificate-window-empty';
            empty.innerText = 'No certificates listed yet.';
            container.appendChild(empty);
            this.windowManager.open('certificate-explorer', 'Certificates', container, 860, 620);
            return;
        }

        certs.forEach((cert, index) => {
            const card = document.createElement('div');
            card.className = 'explorer-item certificate-card';
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Open certificate ${cert.name}`);

            const openCertificate = () => this.openCertificateWindow(index);
            card.onclick = openCertificate;
            card.onkeydown = (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openCertificate();
                }
            };

            const safeImage = this.getSafeImage(cert);
            let preview: HTMLElement;

            if (safeImage) {
                const img = document.createElement('img');
                img.className = 'certificate-card-thumb';
                img.src = safeImage;
                img.alt = `${cert.name} preview`;
                preview = img;
            } else {
                const fallback = document.createElement('div');
                fallback.className = 'certificate-card-thumb certificate-card-fallback';
                fallback.innerText = 'No Preview';
                preview = fallback;
            }

            const previewShell = document.createElement('div');
            previewShell.className = 'certificate-card-preview';
            previewShell.appendChild(preview);

            const body = document.createElement('div');
            body.className = 'certificate-card-body';

            const kicker = document.createElement('div');
            kicker.className = 'certificate-card-kicker';
            kicker.innerText = cert.issuer;

            const label = document.createElement('span');
            label.className = 'explorer-label';
            label.innerText = cert.name;

            const meta = document.createElement('div');
            meta.className = 'certificate-card-meta';
            meta.innerText = cert.date || 'Certificate';

            const badges = document.createElement('div');
            badges.className = 'explorer-badges';

            const previewBadge = document.createElement('span');
            previewBadge.className = 'explorer-badge status-completed';
            previewBadge.innerText = 'Preview';
            badges.appendChild(previewBadge);

            if (this.getSafeLink(cert)) {
                const verifyBadge = document.createElement('span');
                verifyBadge.className = 'explorer-badge';
                verifyBadge.innerText = 'Verified';
                badges.appendChild(verifyBadge);
            }

            body.appendChild(kicker);
            body.appendChild(label);
            body.appendChild(meta);
            body.appendChild(badges);

            card.appendChild(previewShell);
            card.appendChild(body);
            container.appendChild(card);
        });

        this.windowManager.open('certificate-explorer', 'Certificates', container, 880, 620);
    }
}
