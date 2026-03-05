import command from '../../config.json';
import { escapeHTML, sanitizeUrl } from '../core/Utils';

type Certification = {
  name?: string;
  issuer?: string;
  date?: string;
  link?: string;
};

const createCertifications = (): string[] => {
  const certifications: string[] = [];
  const SPACE = "&nbsp;";
  const config = command as unknown as { certifications?: Certification[] };

  certifications.push("<br>");

  if (!Array.isArray(config.certifications) || config.certifications.length === 0) {
    certifications.push("No certifications listed yet.");
    certifications.push("<br>");
    return certifications;
  }

  config.certifications.forEach((cert) => {
    const name = escapeHTML(String(cert.name ?? "Untitled Certification"));
    const issuer = escapeHTML(String(cert.issuer ?? "Unknown Issuer"));
    const date = escapeHTML(String(cert.date ?? "Unknown Date"));
    const safeLink = sanitizeUrl(String(cert.link ?? ""), { allowRelative: false });

    let line = "";
    line += SPACE.repeat(2);
    line += `<span class='command'>${name}</span>`;
    certifications.push(line);

    line = "";
    line += SPACE.repeat(4);
    line += `${issuer} - ${date}`;
    certifications.push(line);

    if (safeLink) {
      line = "";
      line += SPACE.repeat(4);
      line += `<a href='${safeLink}' target='_blank' rel='noopener noreferrer'>${escapeHTML(safeLink)}</a>`;
      certifications.push(line);
    }

    certifications.push("<br>");
  });

  return certifications;
};

export const CERTIFICATIONS = createCertifications();
