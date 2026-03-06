import command from '../../config.json';
import { escapeHTML, sanitizeUrl } from '../core/Utils';

type Certification = {
  name?: string;
  issuer?: string;
  date?: string;
  link?: string;
  image?: string;
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

  config.certifications.forEach((cert, index) => {
    const name = escapeHTML(String(cert.name ?? "Untitled Certification"));
    const issuer = escapeHTML(String(cert.issuer ?? "Unknown Issuer"));
    const date = String(cert.date ?? "").trim();
    const safeDate = date ? escapeHTML(date) : "";
    const safeLink = sanitizeUrl(String(cert.link ?? ""), { allowRelative: false });

    let line = "";
    line += SPACE.repeat(2);
    line += `<span class='command clickable' role='button' tabindex='0' aria-label='Open certificate ${name}' style='cursor: pointer;' onclick='window.openCertificateWindow(${index})' onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.openCertificateWindow(${index})}">${name}</span>`;
    certifications.push(line);

    line = "";
    line += SPACE.repeat(4);
    line += safeDate ? `${issuer} - ${safeDate}` : issuer;
    certifications.push(line);

    if (safeLink) {
      line = "";
      line += SPACE.repeat(4);
      line += `<a href='${safeLink}' target='_blank' rel='noopener noreferrer'>Verify online</a>`;
      certifications.push(line);
    }

    certifications.push("<br>");
  });

  return certifications;
};

export const CERTIFICATIONS = createCertifications();
