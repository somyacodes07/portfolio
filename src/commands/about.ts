import command from '../../config.json';
import { escapeHTML, sanitizeUrl } from '../core/Utils';
import { getCachedContributionLines } from './github';

const createAboutBase = (): string[] => {
  const about: string[] = [];

  const SPACE = "&nbsp;";

  const EMAIL = "Email";
  const GITHUB = "Github";
  const LINKEDIN = "Linkedin";

  const email = `<i class='fa-solid fa-envelope'></i> ${EMAIL}`;
  const github = `<i class='fa-brands fa-github'></i> ${GITHUB}`;
  const linkedin = `<i class='fa-brands fa-linkedin'></i> ${LINKEDIN}`;
  let string = "";

  about.push("<br>");
  about.push(escapeHTML(command.aboutGreeting));
  about.push("<br>");

  // Professional Summary
  about.push("Building modern web apps with React, Node.js, and AI integrations.");
  about.push("<br>");
  about.push("I think about layout, interaction, and logic as parts of the same system.");
  about.push("<br>"); 
  about.push("I like having control from idea to implementation.");
  about.push("<br>");
  about.push("Most of my learning comes from building, experimenting, ");
  about.push("and refining how things work together.");
  about.push("<br>");

  string += SPACE.repeat(2);
  string += email;
  string += SPACE.repeat(Math.max(0, 17 - EMAIL.length));
  const safeEmailHref = sanitizeUrl(`mailto:${command.social.email}`, { allowRelative: false, allowMailto: true });
  const safeEmailText = escapeHTML(command.social.email);
  string += safeEmailHref
    ? `<a target='_blank' rel='noopener noreferrer' href='${safeEmailHref}'>${safeEmailText}</a>`
    : safeEmailText;
  about.push(string);

  string = '';
  string += SPACE.repeat(2);
  string += github;
  string += SPACE.repeat(Math.max(0, 17 - GITHUB.length));
  const safeGithub = sanitizeUrl(command.social.github, { allowRelative: false });
  const safeGithubText = escapeHTML(command.social.github);
  string += safeGithub
    ? `<a target='_blank' rel='noopener noreferrer' href='${safeGithub}'>${safeGithubText}</a>`
    : safeGithubText;
  about.push(string);

  string = '';
  string += SPACE.repeat(2);
  string += linkedin;
  string += SPACE.repeat(Math.max(0, 17 - LINKEDIN.length));
  const safeLinkedIn = sanitizeUrl(command.social.linkedin, { allowRelative: false });
  const safeLinkedInText = escapeHTML(command.social.linkedin);
  string += safeLinkedIn
    ? `<a target='_blank' rel='noopener noreferrer' href='${safeLinkedIn}'>${safeLinkedInText}</a>`
    : safeLinkedInText;
  about.push(string);

  about.push("<br>");
  return about
}

/**
 * Returns the full about output including the GitHub contribution graph.
 * Called dynamically (not cached at import time) so it picks up
 * the pre-fetched contribution data.
 */
export const getAbout = (): string[] => {
  const about = createAboutBase();
  const graphLines = getCachedContributionLines();
  if (graphLines.length > 0) {
    about.push(...graphLines);
  }
  return about;
}
