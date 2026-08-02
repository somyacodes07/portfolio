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

    let line = "";
    line += SPACE.repeat(2);
    line += `<span class='command clickable' role='button' tabindex='0' aria-label='Open ${company}' style='cursor: pointer;' onclick='if(window.innerWidth>600){window.openCompanyWindow("${companyId}")}'>${company}</span>`;
    line += ` - <span style="color: var(--prompt-user, #7EE787);">${role}</span>`;
    output.push(line);

    const meta = [period, location].filter(Boolean).join(' • ');
    if (meta) {
      line = "";
      line += SPACE.repeat(4);
      line += `<span style="opacity: 0.75; font-size: 0.9em;">${meta}</span>`;
      output.push(line);
    }

    if (Array.isArray(exp.documents) && exp.documents.length > 0) {
      exp.documents.forEach((doc) => {
        const title = escapeHTML(String(doc.title ?? 'Document'));
        const type = escapeHTML(String(doc.type ?? 'PDF'));
        const docFile = doc.file ?? '';

        line = "";
        line += SPACE.repeat(4);
        line += `<a href="${docFile}" target="_blank" rel="noopener noreferrer">${title}</a> (${type})`;
        output.push(line);
      });
    }

    output.push("<br>");
  });

  return output;
};

export const EXPERIENCE = createExperienceCommand();
export { createExperienceCommand };
