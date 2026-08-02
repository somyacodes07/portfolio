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
    const image = cert.image ? sanitizeUrl(String(cert.image), { allowRelative: true }) : '';

    let block = `<div class="cli-block">`;
    block += `<div class="cli-header"><span class="cli-title command clickable" role="button" tabindex="0" onclick="if(window.innerWidth>600){window.openCertificateWindow(${index})}else{if('${image}'){window.open('${image}','_blank')}}"><i class="fa-solid fa-award" style="margin-right:6px;"></i>${name}</span><span class="cli-subtitle">${issuer}${safeDate ? ' • ' + safeDate : ''}</span></div>`;

    if (safeLink || image) {
      block += `<div class="cli-actions">`;
      if (image) {
        block += `<a class="cli-link" href="${image}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-certificate"></i> View Certificate</a>`;
      }
      if (safeLink) {
        block += `<a class="cli-link" href="${safeLink}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-up-right-from-square"></i> Verify Online</a>`;
      }
      block += `</div>`;
    }

    block += `</div>`;
    certifications.push(block);
  });

  certifications.push("<br>");
  return certifications;
};

export const CERTIFICATIONS = createCertifications();
