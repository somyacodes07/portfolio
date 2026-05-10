import command from '../../config.json';
import { escapeHTML } from '../core/Utils';

const createBanner = (): string[] => {
  const banner: string[] = [];
  const isMobile = window.innerWidth <= 600;

  // Use config.asciiMobile if it exists and we're on mobile, otherwise default to config.ascii
  const asciiArt = (isMobile && command.asciiMobile) ? command.asciiMobile : command.ascii;

  banner.push("<br>")
  asciiArt.forEach((ele) => {
    const bannerString = escapeHTML(ele).replace(/ /g, "&nbsp;");

    // Added color:var(--banner) to explicitly apply the theme color, fixing the white text issue
    let eleToPush = `<pre style="color:var(--banner)">${bannerString}</pre>`;
    banner.push(eleToPush);
  });
  banner.push("<br>");
  banner.push("Welcome to Webterm v1.1.1");
  banner.push("Type <span class='command clickable' data-command='help' role='button' tabindex='0' aria-label='Run help command'>'help'</span> for a list of all available commands.");
  banner.push(`Type <span class='command clickable' data-command='repo' role='button' tabindex='0' aria-label='Run repo command'>'repo'</span> to view the GitHub repository.`);
  banner.push("<br>");
  return banner;
}

export const getBanner = () => createBanner();
