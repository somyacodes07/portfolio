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
  const SPACE = "&nbsp;";

  if (args && args.includes('--gui')) {
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

    let line = "";
    line += SPACE.repeat(2);
    line += `<i class="fa-solid fa-folder-open" style="color: var(--banner, #58A6FF); margin-right: 6px;"></i>`;
    line += `<span class='command clickable' role='button' tabindex='0' aria-label='Open ${company} folder' style='cursor: pointer;' onclick='window.openCompanyWindow("${companyId}")' onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.openCompanyWindow('${companyId}')}">${company}</span>`;
    line += ` <span style="opacity: 0.75; font-size: 0.9em;">(${role})</span>`;
    output.push(line);

    line = "";
    line += SPACE.repeat(4);
    line += `<span style="color: var(--prompt-user, #7EE787); font-size: 0.9em;">${[period, location].filter(Boolean).join(' • ')}</span>`;
    output.push(line);

    if (Array.isArray(exp.documents) && exp.documents.length > 0) {
      exp.documents.forEach((doc) => {
        const title = escapeHTML(String(doc.title ?? 'Document'));
        const type = escapeHTML(String(doc.type ?? 'PDF'));
        const docFile = doc.file ?? '';

        line = "";
        line += SPACE.repeat(6);
        line += `<i class="fa-solid fa-file-pdf" style="color: #ff5555; margin-right: 6px;"></i>`;
        line += `<a href="${docFile}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: var(--text);">${title}</a>`;
        line += ` <span class="explorer-badge" style="font-size: 10px; margin-left: 6px;">${type}</span>`;
        output.push(line);
      });
    }

    output.push("<br>");
  });

  return output;
};

export const EXPERIENCE = createExperienceCommand();
export { createExperienceCommand };
