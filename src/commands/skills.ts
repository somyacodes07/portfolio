import command from '../../config.json';
import { escapeHTML } from '../core/Utils';

interface SkillItem {
    name: string;
    desc: string;
}

interface SkillCategory {
    key: string;
    label: string;
}

const COL_WIDTH = 28;
const INDENT = 2;
const SP = '&nbsp;';

const CATEGORIES: SkillCategory[] = [
    { key: 'languages', label: 'Languages' },
    { key: 'web', label: 'Web' },
    { key: 'backend', label: 'Backend' },
    { key: 'ai_ml', label: 'AI / ML' },
    { key: 'tools', label: 'Tools' }
];

/** Read skill items from config for a given category key. */
const getItems = (config: any, key: string): SkillItem[] => {
    const raw = config.skills?.[key] as any[] | undefined;
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => ({
        name: String(typeof item === 'string' ? item : item.name ?? ''),
        desc: String(typeof item === 'string' ? '' : item.desc ?? '')
    }));
};

/** Render a single skill name as an interactive tag with a styled hover tooltip. */
const skillTag = (item: SkillItem): string => {
    const tip = item.desc ? ` data-tip="${escapeHTML(item.desc)}"` : '';
    return `<span class="skill-tag"${tip}>${escapeHTML(item.name)}</span>`;
};

/** Render two categories side-by-side in a fixed-width two-column layout. */
const renderPair = (config: any, left: SkillCategory, right: SkillCategory): string[] => {
    const leftItems = getItems(config, left.key);
    const rightItems = getItems(config, right.key);
    const maxRows = Math.max(leftItems.length, rightItems.length);
    const lines: string[] = [];

    // Header
    let header = SP.repeat(INDENT);
    header += `<span class="skill-col-header" style="display:inline-block;width:${COL_WIDTH}ch">${escapeHTML(left.label)}</span>`;
    header += `<span class="skill-col-header">${escapeHTML(right.label)}</span>`;
    lines.push(header);

    // Separator
    let sep = SP.repeat(INDENT);
    sep += `<span class="skill-separator" style="display:inline-block;width:${COL_WIDTH}ch">${'─'.repeat(left.label.length)}</span>`;
    sep += `<span class="skill-separator">${'─'.repeat(right.label.length)}</span>`;
    lines.push(sep);

    // Rows
    for (let i = 0; i < maxRows; i++) {
        let row = SP.repeat(INDENT);

        if (i < leftItems.length) {
            row += `<span style="display:inline-block;width:${COL_WIDTH}ch">${skillTag(leftItems[i])}</span>`;
        } else {
            row += `<span style="display:inline-block;width:${COL_WIDTH}ch">${SP}</span>`;
        }

        if (i < rightItems.length) {
            row += skillTag(rightItems[i]);
        }

        lines.push(row);
    }

    return lines;
};

/** Render a standalone category as inline tags separated by dots. */
const renderInline = (config: any, cat: SkillCategory): string[] => {
    const items = getItems(config, cat.key);
    if (items.length === 0) return [];
    const lines: string[] = [];

    let header = SP.repeat(INDENT);
    header += `<span class="skill-col-header">${escapeHTML(cat.label)}</span>`;
    lines.push(header);

    let sep = SP.repeat(INDENT);
    sep += `<span class="skill-separator">${'─'.repeat(cat.label.length)}</span>`;
    lines.push(sep);

    let row = SP.repeat(INDENT);
    row += items.map(item => skillTag(item)).join(`<span class="skill-separator"> · </span>`);
    lines.push(row);

    return lines;
};

export const getSkills = (): string[] => {
    const config = (window as any).config || command;
    if (!config.skills) return [];

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;
    const lines: string[] = ['<br>'];

    if (isMobile) {
        CATEGORIES.forEach((cat) => {
            lines.push(...renderInline(config, cat));
            lines.push('<br>');
        });
        return lines;
    }

    // Pair 1: Languages | Web
    lines.push(...renderPair(config, CATEGORIES[0], CATEGORIES[1]));
    lines.push('<br>');

    // Pair 2: Backend | AI/ML
    lines.push(...renderPair(config, CATEGORIES[2], CATEGORIES[3]));
    lines.push('<br>');

    // Standalone: Tools (inline tags)
    lines.push(...renderInline(config, CATEGORIES[4]));
    lines.push('<br>');

    return lines;
};

export const SKILLS = []; // Legacy compatibility
