import command from '../../config.json';
import { escapeHTML, sanitizeUrl } from '../core/Utils';

const createProject = (args?: string[]): string[] => {
  const projects: string[] = [];

  if (args && args.includes('--gui')) {
    (window as any).openProjectExplorer();
    return ["Opening Project Explorer..."];
  }

  const SPACE = "&nbsp;";

  projects.push("<br>")

  command.projects.forEach((ele: any[]) => {
    let string = "";
    // Config: [Title, Desc, Link, Img, Video, Screenshots[]]
    const rawTitle = String(ele[0] ?? "");
    const rawUrl = String(ele[2] ?? "");
    const rawVideoUrl = typeof ele[4] === "string" ? ele[4] : undefined;
    const rawScreenshots = Array.isArray(ele[5]) ? ele[5] : undefined;

    // For Display: standard HTML escaping
    const displayTitle = escapeHTML(rawTitle);

    // For JS Arguments (inside onclick):
    // 1. JSON.stringify() to get a valid JS string literal (e.g. "It's time")
    // 2. escapeHTML() to make it safe to sit inside an HTML attribute (encodes " to &quot;)
    const jsTitle = escapeHTML(JSON.stringify(rawTitle));
    const jsUrl = escapeHTML(JSON.stringify(rawUrl));

    const jsVideo = rawVideoUrl
      ? escapeHTML(JSON.stringify(rawVideoUrl))
      : 'undefined';

    const jsScreenshots = rawScreenshots
      ? escapeHTML(JSON.stringify(rawScreenshots))
      : 'undefined';

    const onClickCall = `window.openProjectWindow(${jsTitle}, ${jsUrl}, ${jsVideo}, ${jsScreenshots})`;
    const onKeyCall = `if(event.key==='Enter'||event.key===' '){event.preventDefault();${onClickCall}}`;

    // WebDesktop Link (Main Click)
    let link = `<span class="command clickable" role="button" tabindex="0" aria-label="Open project ${displayTitle}" style="cursor: pointer;" onclick="${onClickCall}" onkeydown="${onKeyCall}">${displayTitle}</span>`;

    // External Icon (GitHub) - rawUrl ok here because it's inside href="..." which browsers handle if standardly quoted, 
    // but better to escapeHTML(rawUrl) for safety in case of double quotes in URL.
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
