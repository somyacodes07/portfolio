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
    return "1y 3m";
}

const createFetch = (): string[] => {
  const output: string[] = [];
  const isMobile = window.innerWidth <= 600;

  output.push("<br>");

  if (isMobile) {
      // Mobile: just the SS design, no fetch text
      const asciiArt = command.asciiMobile || command.ascii;
      asciiArt.forEach((ele) => {
          const asciiString = escapeHTML(ele).replace(/ /g, "&nbsp;");
          output.push(`<pre style="color:var(--banner)">${asciiString}</pre>`);
      });
      output.push("<br>");
      return output;
  }

  // Desktop: Neofetch style
  const asciiArt = command.ascii;
  
  // Prepare info lines
  const titleLine = `<span class="prompt-user">Welcome to WebTerm!</span>`;
  const sepLine = `─────────────────────`;
  
  const infoLines = [
      titleLine,
      sepLine,
      `<span class="prompt-user">OS:</span>        WebTerm v1.1.1`,
      `<span class="prompt-user">Shell:</span>     IBM Plex Mono`,
      `<span class="prompt-user">Theme:</span>     ${getTheme()}`,
      `<span class="prompt-user">Uptime:</span>    ${getUptime()}`,
      `<span class="prompt-user">Projects:</span>  ${command.projects.length}`,
      `<span class="prompt-user">Skills:</span>    19`,
      `<span class="prompt-user">Certs:</span>     ${command.certifications ? command.certifications.length : 3}`,
      ``,
      // Color blocks
      `<span style="background:var(--bg);color:var(--bg)">███</span><span style="background:var(--prompt-host);color:var(--prompt-host)">███</span><span style="background:var(--prompt-user);color:var(--prompt-user)">███</span><span style="background:var(--banner);color:var(--banner)">███</span>`
  ];

  const asciiArtWithHelp = [...asciiArt, "","","", "Type 'help' for all commands."];
  const maxAsciiWidth = Math.max(...asciiArtWithHelp.map(line => line.length));
  const maxLines = Math.max(asciiArtWithHelp.length, infoLines.length);

  for (let i = 0; i < maxLines; i++) {
      const leftRaw = asciiArtWithHelp[i] || "";
      // Pad right with spaces
      const leftPadded = leftRaw + " ".repeat(Math.max(0, maxAsciiWidth - leftRaw.length));
      
      let leftHtml;
      if (i === asciiArtWithHelp.length - 1) { // The help text line
          const escaped = escapeHTML(leftPadded).replace(/ /g, "&nbsp;");
          const clickable = escaped.replace("&#039;help&#039;", "<span class='command clickable' data-command='help' role='button' tabindex='0'>'help'</span>");
          leftHtml = `<pre style="display:inline; margin:0; padding:0; color:var(--text, #fff)">${clickable}</pre>`;
      } else {
          leftHtml = `<pre style="display:inline; margin:0; padding:0; color:var(--banner)">${escapeHTML(leftPadded).replace(/ /g, "&nbsp;")}</pre>`;
      }
      
      const rightHtml = infoLines[i] || "";
      
      const spacer = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
      output.push(`<div>${leftHtml}${spacer}${rightHtml}</div>`);
  }

  output.push("<br>");
  return output;
}

export const getFetch = () => createFetch();
