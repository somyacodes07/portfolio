import command from '../../config.json';
import { escapeHTML } from '../core/Utils';

const getTheme = () => {
    try {
        return localStorage.getItem('currentTheme') || 'default';
    } catch {
        return 'default';
    }
}

const getUptime = () => {
    // Fake uptime since a hardcoded date, or just simple text
    return "1y 2m (since May 2025)";
}

const createBanner = (): string[] => {
  const banner: string[] = [];
  const isMobile = window.innerWidth <= 600;

  banner.push("<br>");

  if (isMobile) {
      // Mobile: just the SS design, no fetch text
      const asciiArt = command.asciiMobile || command.ascii;
      asciiArt.forEach((ele) => {
          const bannerString = escapeHTML(ele).replace(/ /g, "&nbsp;");
          banner.push(`<pre>${bannerString}</pre>`);
      });
      banner.push("<br>");
      banner.push("Welcome to Webterm v1.1.1");
      banner.push("Type <span class='command clickable' data-command='help' role='button' tabindex='0'>'help'</span> for a list of all available commands.");
      banner.push("<br>");
      return banner;
  }

  // Desktop: Neofetch style
  const asciiArt = command.ascii;
  
  // Prepare info lines
  const username = command.username;
  const hostname = command.hostname;
  const titleLine = `<span class="prompt-user">${username}</span>@<span class="prompt-host">${hostname}</span>`;
  const sepLine = `─────────────────────`;
  
  const infoLines = [
      titleLine,
      sepLine,
      `<span class="prompt-user">OS</span>        WebTerm v1.1.1`,
      `<span class="prompt-user">Shell</span>     IBM Plex Mono`,
      `<span class="prompt-user">Theme</span>     ${getTheme()}`,
      `<span class="prompt-user">Uptime</span>    ${getUptime()}`,
      `<span class="prompt-user">Projects</span>  ${command.projects.length}`,
      `<span class="prompt-user">Skills</span>    19`,
      `<span class="prompt-user">Certs</span>     ${command.certifications ? command.certifications.length : 3}`,
      ``,
      // Color blocks
      `<span style="background:var(--bg);color:var(--bg)">███</span><span style="background:var(--prompt-host);color:var(--prompt-host)">███</span><span style="background:var(--prompt-user);color:var(--prompt-user)">███</span><span style="background:var(--banner);color:var(--banner)">███</span>`
  ];

  const maxAsciiWidth = Math.max(...asciiArt.map(line => line.length));
  const maxLines = Math.max(asciiArt.length, infoLines.length);

  for (let i = 0; i < maxLines; i++) {
      const leftRaw = asciiArt[i] || "";
      // Pad right with spaces
      const leftPadded = leftRaw + " ".repeat(Math.max(0, maxAsciiWidth - leftRaw.length));
      const leftHtml = `<pre style="display:inline; margin:0; padding:0; color:var(--banner)">${escapeHTML(leftPadded).replace(/ /g, "&nbsp;")}</pre>`;
      
      const rightHtml = infoLines[i] || "";
      
      const spacer = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
      banner.push(`<div>${leftHtml}${spacer}${rightHtml}</div>`);
  }

  banner.push("<br>");
  banner.push("Welcome to Webterm v1.1.1");
  banner.push("Type <span class='command clickable' data-command='help' role='button' tabindex='0'>'help'</span> for a list of all available commands.");
  banner.push("<br>");

  return banner;
}

export const getBanner = () => createBanner();
