import command from '../../config.json';
import { escapeHTML, sanitizeUrl } from '../core/Utils';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const createProject = (args?: string[]): string[] => {
  const projects: string[] = [];

  if (args && args.includes('--gui')) {
    (window as any).openProjectExplorer();
    return ["Opening Project Explorer..."];
  }

  const SPACE = "&nbsp;";

  projects.push("<br>")

  command.projects.forEach((ele: any[], idx: number) => {
    let string = "";
    // Config: [Title, Desc, RepoLink, LiveLinkOrThumb, Video, Screenshots[], Meta?]
    const rawTitle = String(ele[0] ?? "");
    const rawRepoUrl = String(ele[2] ?? "");
    const rawSlot4 = String(ele[3] ?? "");
    const liveLink = isHttpUrl(rawSlot4) ? rawSlot4 : '';
    const rawUrl = liveLink || rawRepoUrl;
    const rawVideoUrl = typeof ele[4] === "string" ? ele[4] : undefined;
    const rawScreenshots = Array.isArray(ele[5]) ? ele[5] : undefined;

    // For Display: standard HTML escaping
    const displayTitle = escapeHTML(rawTitle);

    // Store data on the element for event delegation
    const dataAttrs = [
      `data-proj-idx="${idx}"`,
      `data-proj-title="${escapeHTML(rawTitle)}"`,
      `data-proj-url="${escapeHTML(rawUrl)}"`,
    ];

    if (rawVideoUrl) {
      dataAttrs.push(`data-proj-video="${escapeHTML(rawVideoUrl)}"`);
    }
    if (rawScreenshots) {
      dataAttrs.push(`data-proj-screenshots="${escapeHTML(JSON.stringify(rawScreenshots))}"`);
    }
    if (liveLink) {
      dataAttrs.push(`data-proj-live="${escapeHTML(liveLink)}"`);
    }

    // WebDesktop Link (Main Click) - uses data attributes instead of inline onclick
    let link = `<span class="command clickable proj-link" role="button" tabindex="0" aria-label="Open project ${displayTitle}" style="cursor: pointer;" ${dataAttrs.join(' ')}>${displayTitle}</span>`;

    // External Icon (GitHub)
    const safeExtUrl = sanitizeUrl(rawUrl, { allowRelative: false });
    let ext = "";
    if (safeExtUrl) {
      ext = `<a href="${safeExtUrl}" target="_blank" rel="noopener noreferrer" style="margin-left: 8px; text-decoration: none;"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    }

    string += SPACE.repeat(2);
    string += link + ext;
    projects.push(string);
  });

  projects.push("<br>");
  return projects;
}

export const PROJECTS = createProject();
export { createProject };
