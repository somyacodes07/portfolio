import command from '../../config.json';
import { escapeHTML, sanitizeUrl } from '../core/Utils';
import { getCachedContributionLines } from './github';

const createAboutBase = (): string[] => {
  const about: string[] = [];
  const SP = "&nbsp;";

  about.push("<br>");
  about.push(`<strong>${escapeHTML(command.aboutGreeting)}</strong>`);
  about.push("<br>");

  about.push("Building modern web apps with React, Next.js, Node.js, Python, and AI integrations.");
  about.push("I think about layout, interaction, and logic as parts of the same system.");
  about.push("Most of my learning comes from building, experimenting, and refining scalable applications.");
  about.push("<br>");

  const emailHref = sanitizeUrl(`mailto:${command.social.email}`, { allowRelative: false, allowMailto: true });
  const emailText = escapeHTML(command.social.email);

  const githubHref = sanitizeUrl(command.social.github, { allowRelative: false });
  const githubText = escapeHTML(command.social.github);

  const linkedinHref = sanitizeUrl(command.social.linkedin, { allowRelative: false });
  const linkedinText = escapeHTML(command.social.linkedin);

  if (emailHref) {
    about.push(`${SP.repeat(2)}<span style="color:var(--banner);"><i class="fa-solid fa-envelope"></i> Email:</span> <a href="${emailHref}" style="color:var(--text); text-decoration:underline;">${emailText}</a>`);
  }
  if (githubHref) {
    about.push(`${SP.repeat(2)}<span style="color:var(--banner);"><i class="fa-brands fa-github"></i> GitHub:</span> <a href="${githubHref}" target="_blank" rel="noopener noreferrer" style="color:var(--text); text-decoration:underline;">${githubText}</a>`);
  }
  if (linkedinHref) {
    about.push(`${SP.repeat(2)}<span style="color:var(--banner);"><i class="fa-brands fa-linkedin"></i> LinkedIn:</span> <a href="${linkedinHref}" target="_blank" rel="noopener noreferrer" style="color:var(--text); text-decoration:underline;">${linkedinText}</a>`);
  }

  about.push("<br>");
  return about;
};

export const getAbout = (): string[] => {
  const about = createAboutBase();
  const graphLines = getCachedContributionLines();
  if (graphLines.length > 0) {
    about.push(...graphLines);
  }
  return about;
};
