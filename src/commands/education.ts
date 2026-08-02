import command from '../../config.json';
import { escapeHTML } from '../core/Utils';

const createEducation = (): string[] => {
    const education: string[] = [];
    const SP = "&nbsp;";

    education.push("<br>");

    if (command.education && Array.isArray(command.education)) {
        command.education.forEach((edu: any) => {
            const degree = escapeHTML(String(edu.degree ?? "Degree"));
            const institution = escapeHTML(String(edu.institution ?? "Institution"));
            const period = escapeHTML(String(edu.period ?? ""));

            let line = `${SP.repeat(2)}<span style="color:var(--banner); font-weight:600;"><i class="fa-solid fa-graduation-cap"></i> ${degree}</span>`;
            if (period) {
                line += ` <span style="color:var(--prompt-user); font-size:0.9em;">(${period})</span>`;
            }
            education.push(line);

            education.push(`${SP.repeat(4)}<span style="opacity:0.8;">${institution}</span>`);
            education.push("<br>");
        });
    }

    return education;
};

export const EDUCATION = createEducation();
