import command from '../../config.json';
import { escapeHTML, sanitizeUrl, parseYouTubeId } from '../core/Utils';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const createProject = (args?: string[]): string[] => {
  const projects: string[] = [];

  if (args && args.includes('--gui') && window.innerWidth > 600) {
    (window as any).openProjectExplorer();
    return ["Opening Project Explorer..."];
  }

  projects.push("<br>");

  command.projects.forEach((ele: any[], idx: number) => {
    // Config: [Title, Desc, RepoLink, LiveLinkOrThumb, Video, Screenshots[], Meta?]
    const rawTitle = String(ele[0] ?? "");
    const rawDesc = String(ele[1] ?? "");
    const rawRepoUrl = String(ele[2] ?? "");
    const rawSlot4 = String(ele[3] ?? "");
    const liveLink = isHttpUrl(rawSlot4) ? rawSlot4 : '';
    const rawUrl = liveLink || rawRepoUrl;
    const rawVideoUrl = typeof ele[4] === "string" ? ele[4] : undefined;
    const rawScreenshots = Array.isArray(ele[5]) ? ele[5] : undefined;
    const meta = typeof ele[6] === "object" ? ele[6] : undefined;

    const displayTitle = escapeHTML(rawTitle);
    const displayDesc = escapeHTML(rawDesc);

    const dataAttrs = [
      `data-proj-idx="${idx}"`,
      `data-proj-title="${escapeHTML(rawTitle)}"`,
      `data-proj-url="${escapeHTML(rawUrl)}"`,
    ];

    if (rawVideoUrl) dataAttrs.push(`data-proj-video="${escapeHTML(rawVideoUrl)}"`);
    if (rawScreenshots) dataAttrs.push(`data-proj-screenshots="${escapeHTML(JSON.stringify(rawScreenshots))}"`);
    if (liveLink) dataAttrs.push(`data-proj-live="${escapeHTML(liveLink)}"`);

    let block = `<div class="cli-block">`;
    block += `<div class="cli-header"><span class="cli-title command clickable proj-link" role="button" tabindex="0" ${dataAttrs.join(' ')}><i class="fa-solid fa-code" style="margin-right:6px;"></i>${displayTitle}</span>`;
    if (meta?.year) {
      block += `<span class="cli-subtitle">${escapeHTML(meta.year)}</span>`;
    }
    block += `</div>`;

    if (displayDesc) {
      block += `<div class="cli-desc">${displayDesc}</div>`;
    }

    if (meta?.stack && Array.isArray(meta.stack) && meta.stack.length > 0) {
      block += `<div class="cli-tags">`;
      meta.stack.forEach((tech: string) => {
        block += `<span class="explorer-badge">${escapeHTML(tech)}</span>`;
      });
      block += `</div>`;
    }

    const safeRepoUrl = sanitizeUrl(rawRepoUrl, { allowRelative: false });
    const safeLiveUrl = liveLink ? sanitizeUrl(liveLink, { allowRelative: false }) : '';

    block += `<div class="cli-actions">`;
    if (safeLiveUrl) {
      block += `<a class="cli-link" href="${safeLiveUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-globe"></i> Live App</a>`;
    }
    if (safeRepoUrl) {
      block += `<a class="cli-link" href="${safeRepoUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github"></i> GitHub Repo</a>`;
    }
    block += `</div>`;

    block += `</div>`;
    projects.push(block);
  });

  projects.push("<br>");
  return projects;
};

export const PROJECTS = createProject();
export { createProject };
