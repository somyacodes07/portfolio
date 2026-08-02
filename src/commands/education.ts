import command from '../../config.json';
import { escapeHTML } from '../core/Utils';

const createEducation = (): string[] => {
    const education: string[] = [];

    education.push("<br>");

    if (command.education && Array.isArray(command.education)) {
        command.education.forEach((edu: any) => {
            const degree = escapeHTML(String(edu.degree ?? "Degree"));
            const institution = escapeHTML(String(edu.institution ?? "Institution"));
            const period = escapeHTML(String(edu.period ?? ""));

            let block = `<div class="cli-block">`;
            block += `<div class="cli-header"><span class="cli-title"><i class="fa-solid fa-graduation-cap" style="margin-right:6px;"></i>${degree}</span><span class="cli-subtitle">${period}</span></div>`;
            block += `<div class="cli-desc" style="margin-bottom: 0;">${institution}</div>`;
            block += `</div>`;
            education.push(block);
        });
    }

    education.push("<br>");
    return education;
};

export const EDUCATION = createEducation();
