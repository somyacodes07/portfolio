import command from '../../config.json';
import { WindowManager } from '../core/WindowManager';
import { sanitizeUrl } from '../core/Utils';

export type ExperienceDocument = {
    id: string;
    title: string;
    type: 'LOR' | 'Completion Certificate' | 'Offer Letter' | 'Experience Letter' | string;
    date?: string;
    file: string;
    description?: string;
};

export type CompanyExperience = {
    id: string;
    company: string;
    role: string;
    period: string;
    location?: string;
    icon?: string;
    description?: string;
    documents: ExperienceDocument[];
};

export class ExperienceViewer {
    private windowManager: WindowManager;

    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager;
    }

    private isMobile(): boolean {
        return window.innerWidth <= 600;
    }

    public getExperiences(): CompanyExperience[] {
        const config = command as unknown as { experience?: CompanyExperience[] };
        if (!Array.isArray(config.experience)) {
            return [];
        }

        return config.experience.map((exp, idx) => ({
            id: exp.id || `company-${idx}`,
            company: exp.company || `Company ${idx + 1}`,
            role: exp.role || 'Team Member',
            period: exp.period || '',
            location: exp.location || '',
            icon: exp.icon || '',
            description: exp.description || '',
            documents: Array.isArray(exp.documents)
                ? exp.documents.map((doc, dIdx) => ({
                    id: doc.id || `doc-${idx}-${dIdx}`,
                    title: doc.title || 'Document',
                    type: doc.type || 'PDF',
                    date: doc.date || '',
                    file: doc.file || '',
                    description: doc.description || ''
                }))
                : []
        }));
    }

    public openExperienceExplorer(): void {
        if (this.isMobile()) {
            return;
        }

        const experiences = this.getExperiences();
        const container = document.createElement('div');
        container.className = 'explorer-grid experience-grid';

        if (experiences.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'certificate-window-empty';
            empty.innerText = 'No work experience folders listed yet.';
            container.appendChild(empty);
            this.windowManager.open('experience-explorer', 'Work Experience', container, 880, 620);
            return;
        }

        experiences.forEach((exp) => {
            const folderCard = document.createElement('div');
            folderCard.className = 'explorer-item company-folder-card';
            folderCard.tabIndex = 0;
            folderCard.setAttribute('role', 'button');
            folderCard.setAttribute('aria-label', `Open ${exp.company} experience folder`);

            const openFolder = () => this.openCompanyWindow(exp.id);
            folderCard.onclick = openFolder;
            folderCard.onkeydown = (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openFolder();
                }
            };

            // Folder Header Icon
            const iconShell = document.createElement('div');
            iconShell.className = 'company-folder-icon-wrapper';

            const safeIcon = exp.icon ? sanitizeUrl(exp.icon, { allowRelative: true }) : null;
            if (safeIcon) {
                const customIcon = document.createElement('img');
                customIcon.className = 'company-folder-custom-icon';
                customIcon.src = safeIcon;
                customIcon.alt = `${exp.company} logo`;
                iconShell.appendChild(customIcon);
            } else {
                const folderIcon = document.createElement('div');
                folderIcon.className = 'explorer-icon company-folder-icon';
                iconShell.appendChild(folderIcon);
            }

            const badgeCount = document.createElement('span');
            badgeCount.className = 'folder-file-count';
            badgeCount.innerText = `${exp.documents.length}`;
            iconShell.appendChild(badgeCount);

            // Folder Details Body
            const body = document.createElement('div');
            body.className = 'company-folder-body';

            const companyTitle = document.createElement('div');
            companyTitle.className = 'explorer-label company-name';
            companyTitle.innerText = exp.company;

            const roleLabel = document.createElement('div');
            roleLabel.className = 'company-role';
            roleLabel.innerText = exp.role;

            const metaLabel = document.createElement('div');
            metaLabel.className = 'company-period';
            metaLabel.innerText = [exp.period, exp.location].filter(Boolean).join(' • ');

            if (exp.description) {
                const desc = document.createElement('div');
                desc.className = 'explorer-description company-desc';
                desc.innerText = exp.description;
                body.appendChild(desc);
            }

            const docBadges = document.createElement('div');
            docBadges.className = 'explorer-badges company-doc-types';

            const types = Array.from(new Set(exp.documents.map((d) => d.type)));
            types.forEach((typeStr) => {
                const badge = document.createElement('span');
                badge.className = 'explorer-badge doc-type-badge';
                badge.innerText = typeStr;
                docBadges.appendChild(badge);
            });

            body.insertBefore(metaLabel, body.firstChild);
            body.insertBefore(roleLabel, body.firstChild);
            body.insertBefore(companyTitle, body.firstChild);
            body.appendChild(docBadges);

            folderCard.appendChild(iconShell);
            folderCard.appendChild(body);
            container.appendChild(folderCard);
        });

        this.windowManager.open('experience-explorer', 'Work Experience', container, 920, 640);
    }

    public openCompanyWindow(companyId: string): void {
        if (this.isMobile()) {
            return;
        }

        const exp = this.getExperiences().find((item) => item.id === companyId);
        if (!exp) return;

        const container = document.createElement('div');
        container.className = 'company-window-content';

        // Navigation / Header
        const navHeader = document.createElement('div');
        navHeader.className = 'company-window-header';

        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'company-breadcrumb';

        const backBtn = document.createElement('button');
        backBtn.className = 'company-back-btn';
        backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Experience';
        backBtn.onclick = () => this.openExperienceExplorer();

        const breadcrumbSlash = document.createElement('span');
        breadcrumbSlash.className = 'company-breadcrumb-slash';
        breadcrumbSlash.innerText = ' / ';

        const currentFolderName = document.createElement('span');
        currentFolderName.className = 'company-breadcrumb-current';
        currentFolderName.innerText = exp.company;

        breadcrumb.appendChild(backBtn);
        breadcrumb.appendChild(breadcrumbSlash);
        breadcrumb.appendChild(currentFolderName);

        const companyInfo = document.createElement('div');
        companyInfo.className = 'company-header-info';

        const companyTitle = document.createElement('h2');
        companyTitle.className = 'company-header-title';
        companyTitle.innerText = `${exp.company} — Documents`;

        const companyMeta = document.createElement('p');
        companyMeta.className = 'company-header-meta';
        companyMeta.innerText = `${exp.role} (${exp.period})`;

        companyInfo.appendChild(companyTitle);
        companyInfo.appendChild(companyMeta);

        navHeader.appendChild(breadcrumb);
        navHeader.appendChild(companyInfo);
        container.appendChild(navHeader);

        // Document Cards Grid
        const grid = document.createElement('div');
        grid.className = 'explorer-grid company-docs-grid';

        if (exp.documents.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'certificate-window-empty';
            empty.innerText = 'No documents stored in this folder.';
            grid.appendChild(empty);
        } else {
            exp.documents.forEach((doc) => {
                const docCard = document.createElement('div');
                docCard.className = 'explorer-item document-card';
                docCard.tabIndex = 0;
                docCard.setAttribute('role', 'button');
                docCard.setAttribute('aria-label', `Open document ${doc.title}`);

                const openDoc = () => this.openDocumentViewer(doc, exp.company);
                docCard.onclick = openDoc;
                docCard.onkeydown = (e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDoc();
                    }
                };

                const docIconShell = document.createElement('div');
                docIconShell.className = 'doc-card-icon-shell';
                docIconShell.innerHTML = '<i class="fa-solid fa-file-pdf doc-pdf-icon"></i>';

                const docBody = document.createElement('div');
                docBody.className = 'doc-card-body';

                const docTypeTag = document.createElement('div');
                docTypeTag.className = 'doc-card-type';
                docTypeTag.innerText = doc.type.toUpperCase();

                const docTitle = document.createElement('div');
                docTitle.className = 'explorer-label doc-card-title';
                docTitle.innerText = doc.title;

                const docDate = document.createElement('div');
                docDate.className = 'doc-card-date';
                docDate.innerText = doc.date || 'PDF Document';

                if (doc.description) {
                    const docDesc = document.createElement('div');
                    docDesc.className = 'explorer-description doc-card-desc';
                    docDesc.innerText = doc.description;
                    docBody.appendChild(docDesc);
                }

                const docActions = document.createElement('div');
                docActions.className = 'explorer-actions doc-card-actions';

                const viewBtn = document.createElement('span');
                viewBtn.className = 'explorer-action-btn live';
                viewBtn.innerHTML = '<i class="fa-solid fa-eye"></i> View PDF';

                docActions.appendChild(viewBtn);

                docBody.insertBefore(docDate, docBody.firstChild);
                docBody.insertBefore(docTitle, docBody.firstChild);
                docBody.insertBefore(docTypeTag, docBody.firstChild);
                docBody.appendChild(docActions);

                docCard.appendChild(docIconShell);
                docCard.appendChild(docBody);
                grid.appendChild(docCard);
            });
        }

        container.appendChild(grid);
        this.windowManager.open(`company-${exp.id}`, `${exp.company} Documents`, container, 900, 620);
    }

    public openDocumentViewer(doc: ExperienceDocument, companyName: string): void {
        const safeFileUrl = sanitizeUrl(doc.file, { allowRelative: true });
        if (!safeFileUrl) return;

        if (this.isMobile()) {
            window.open(safeFileUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        const shell = document.createElement('div');
        shell.className = 'experience-pdf-shell';

        const header = document.createElement('div');
        header.className = 'experience-pdf-header';

        const copy = document.createElement('div');
        copy.className = 'experience-pdf-copy';

        const eyebrow = document.createElement('div');
        eyebrow.className = 'experience-pdf-eyebrow';
        eyebrow.innerText = `${companyName} • ${doc.type}`;

        const title = document.createElement('h3');
        title.className = 'experience-pdf-title';
        title.innerText = doc.title;

        if (doc.description) {
            const desc = document.createElement('p');
            desc.className = 'experience-pdf-desc';
            desc.innerText = doc.description;
            copy.appendChild(desc);
        }

        copy.insertBefore(title, copy.firstChild);
        copy.insertBefore(eyebrow, copy.firstChild);

        const actions = document.createElement('div');
        actions.className = 'experience-pdf-actions';

        const openTabLink = document.createElement('a');
        openTabLink.className = 'certificate-window-link';
        openTabLink.href = safeFileUrl;
        openTabLink.target = '_blank';
        openTabLink.rel = 'noopener noreferrer';
        openTabLink.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Open Tab';

        const downloadLink = document.createElement('a');
        downloadLink.className = 'certificate-window-link';
        downloadLink.href = safeFileUrl;
        downloadLink.download = `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
        downloadLink.innerHTML = '<i class="fa-solid fa-download"></i> Download';

        actions.appendChild(openTabLink);
        actions.appendChild(downloadLink);

        header.appendChild(copy);
        header.appendChild(actions);
        shell.appendChild(header);

        const iframeContainer = document.createElement('div');
        iframeContainer.className = 'experience-pdf-frame-wrapper';

        const frame = document.createElement('iframe');
        frame.className = 'pdf-viewer-frame experience-pdf-frame';
        frame.title = `${doc.title} PDF`;
        frame.loading = 'lazy';
        frame.src = `${safeFileUrl}#toolbar=0&navpanes=0&zoom=page-width`;
        frame.setAttribute('allow', 'fullscreen');

        iframeContainer.appendChild(frame);
        shell.appendChild(iframeContainer);

        this.windowManager.open(
            `exp-doc-${doc.id}`,
            `${doc.title} — ${companyName}`,
            shell,
            880,
            720
        );
    }
}
