import command from '../../config.json';
import { escapeHTML } from '../core/Utils';

export type ExperienceDocument = {
  id?: string;
  title?: string;
  type?: string;
  date?: string;
  file?: string;
  description?: string;
};

export type CompanyExperience = {
  id?: string;
  company?: string;
  role?: string;
  period?: string;
  location?: string;
  description?: string;
  documents?: ExperienceDocument[];
};

const createExperienceCommand = (args?: string[]): string[] => {
  const output: string[] = [];
  const config = command as unknown as { experience?: CompanyExperience[] };

  if (args && args.includes('--gui') && window.innerWidth > 600) {
    (window as any).openExperienceExplorer();
    return ["Opening Work Experience Explorer...", "<br>"];
  }

  output.push("<br>");

  if (!Array.isArray(config.experience) || config.experience.length === 0) {
    output.push("No work experience listed yet.");
    output.push("<br>");
    return output;
  }

  config.experience.forEach((exp, cIdx) => {
    const company = escapeHTML(String(exp.company ?? `Company ${cIdx + 1}`));
    const role = escapeHTML(String(exp.role ?? 'Software Engineer'));
    const period = escapeHTML(String(exp.period ?? ''));
    const location = escapeHTML(String(exp.location ?? ''));
    const companyId = exp.id ?? `company-${cIdx}`;
    const desc = exp.description ? escapeHTML(String(exp.description)) : '';

    let block = `<div class="cli-block">`;
    block += `<div class="cli-header"><span class="cli-title command clickable" role="button" tabindex="0" onclick="if(window.innerWidth>600){window.openCompanyWindow('${companyId}')}"><i class="fa-solid fa-building" style="margin-right:6px;"></i>${company}</span><span class="cli-subtitle">${role}</span></div>`;

    const meta = [period, location].filter(Boolean).join(' • ');
    if (meta) {
      block += `<div style="font-size: 0.88em; opacity: 0.75; margin-bottom: 6px;">${meta}</div>`;
    }

    if (desc) {
      block += `<div class="cli-desc">${desc}</div>`;
    }

    if (Array.isArray(exp.documents) && exp.documents.length > 0) {
      block += `<div class="cli-actions">`;
      exp.documents.forEach((doc) => {
        const title = escapeHTML(String(doc.title ?? 'Document'));
        const type = escapeHTML(String(doc.type ?? 'PDF'));
        const docFile = doc.file ?? '';
        block += `<a class="cli-link" href="${docFile}" target="_blank" rel="noopener noreferrer"><i class="fa-regular fa-file-pdf"></i> ${title} <span class="explorer-badge" style="font-size:9.5px; margin-left:4px;">${type}</span></a>`;
      });
      block += `</div>`;
    }

    block += `</div>`;
    output.push(block);
  });

  output.push("<br>");
  return output;
};

export const EXPERIENCE = createExperienceCommand();
export { createExperienceCommand };
