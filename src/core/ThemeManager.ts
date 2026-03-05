import { builtInThemes, ThemeColors } from '../commands/themes';
import { hexToRgba } from './Utils';

let styleElement: HTMLStyleElement | null = null;

const normalizeHex = (color: string): string | null => {
    const trimmed = color.trim();
    const shortHexMatch = /^#([A-Fa-f0-9]{3})$/.exec(trimmed);
    if (shortHexMatch) {
        const [r, g, b] = shortHexMatch[1].split('');
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    const longHexMatch = /^#([A-Fa-f0-9]{6})$/.exec(trimmed);
    if (longHexMatch) {
        return `#${longHexMatch[1].toLowerCase()}`;
    }

    return null;
}

const hexToRgb = (hex: string): [number, number, number] | null => {
    const normalized = normalizeHex(hex);
    if (!normalized) return null;

    const r = Number.parseInt(normalized.slice(1, 3), 16);
    const g = Number.parseInt(normalized.slice(3, 5), 16);
    const b = Number.parseInt(normalized.slice(5, 7), 16);
    return [r, g, b];
}

const channelToLinear = (channel: number): number => {
    const srgb = channel / 255;
    return srgb <= 0.03928
        ? srgb / 12.92
        : ((srgb + 0.055) / 1.055) ** 2.4;
}

const luminance = (hex: string): number | null => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;

    const [r, g, b] = rgb;
    return (
        0.2126 * channelToLinear(r) +
        0.7152 * channelToLinear(g) +
        0.0722 * channelToLinear(b)
    );
}

const contrastRatio = (a: string, b: string): number => {
    const lumA = luminance(a);
    const lumB = luminance(b);
    if (lumA === null || lumB === null) return 1;

    const lighter = Math.max(lumA, lumB);
    const darker = Math.min(lumA, lumB);
    return (lighter + 0.05) / (darker + 0.05);
}

const pickReadableTextColor = (background: string, candidates: string[], fallback: string): string => {
    let bestColor = fallback;
    let bestRatio = 0;

    candidates.forEach((candidate) => {
        const ratio = contrastRatio(background, candidate);
        if (ratio > bestRatio) {
            bestRatio = ratio;
            bestColor = candidate;
        }
    });

    return bestColor;
}

export const setTheme = (colors: ThemeColors) => {
    if (!styleElement) {
        styleElement = document.createElement('style');
        document.head.appendChild(styleElement);
    }

    const sheet = styleElement.sheet;
    if (!sheet) return;

    // Clear existing rules
    while (sheet.cssRules.length > 0) {
        sheet.deleteRule(0);
    }

    const background = `html {background: ${colors.background}}`
    const foreground = `body {color: ${colors.foreground}}`
    const inputBackground = `input {background: transparent}`
    const inputForeground = `input {color: ${colors.prompt.input}}`
    const outputColor = `.output {color: ${colors.prompt.input}}`
    const preHost = `#pre-host {color: ${colors.prompt.host}}`
    const host = `#host {color: ${colors.prompt.host}}`
    const promptHost = `.prompt-host {color: ${colors.prompt.host}}`
    const preUser = `#pre-user {color: ${colors.prompt.user}}`
    const user = `#user {color: ${colors.prompt.user}}`
    const promptUser = `.prompt-user {color: ${colors.prompt.user}}`
    const prompt = `.prompt {color: ${colors.prompt.default}}`
    const banner = `pre {color: ${colors.banner}}`
    const link = `a {color: ${colors.link.text}}`
    const linkHighlight = `a:hover {background: ${colors.link.highlightColor}}`
    const linkTextHighlight = `a:hover {color: ${colors.link.highlightText}}`
    const commandHighlight = `.command {color: ${colors.commands.textColor}}`
    const keys = `.keys {color: ${colors.banner}}`
    const scrollbar = `::-webkit-scrollbar-thumb {background: ${colors.banner}}`
    const barTitleColor = pickReadableTextColor(
        colors.border.color,
        [colors.prompt.input, colors.foreground, colors.prompt.default, colors.banner],
        colors.foreground
    );

    if (!colors.border.visible) {
        sheet.insertRule("#bars {display: none}", sheet.cssRules.length)
        sheet.insertRule("main {border: none}", sheet.cssRules.length)
    } else {
        // Need to handle display:block if it was hidden before? 
        // Simplified: we just insert rules. CSS specificity handles the rest usually, 
        // but here we are rewriting all rules on a fresh style tag/cleared sheet 
        // so we should be careful about 'display: none'.
        // Actually, if we clear rules, the default CSS styles apply. 
        // Check main.css/style.css for #bars default display.

        sheet.insertRule(`#bars {display: block; background: ${colors.background}}`, sheet.cssRules.length)
        sheet.insertRule(`main {border: 2px solid ${colors.border.color}}`, sheet.cssRules.length)
        sheet.insertRule(`#bar-1 {background: ${colors.border.color}; color: ${barTitleColor}}`, sheet.cssRules.length)
        sheet.insertRule(`#bar-2 {background: ${colors.border.color}}`, sheet.cssRules.length)
        sheet.insertRule(`#bar-3 {background: ${colors.border.color}}`, sheet.cssRules.length)
        sheet.insertRule(`#bar-4 {background: ${colors.border.color}}`, sheet.cssRules.length)
        sheet.insertRule(`#bar-5 {background: ${colors.border.color}}`, sheet.cssRules.length)
    }

    sheet.insertRule(background, sheet.cssRules.length)
    sheet.insertRule(foreground, sheet.cssRules.length)
    sheet.insertRule(inputBackground, sheet.cssRules.length)
    sheet.insertRule(inputForeground, sheet.cssRules.length)
    sheet.insertRule(outputColor, sheet.cssRules.length)
    sheet.insertRule(preHost, sheet.cssRules.length)
    sheet.insertRule(host, sheet.cssRules.length)
    sheet.insertRule(promptHost, sheet.cssRules.length)
    sheet.insertRule(preUser, sheet.cssRules.length)
    sheet.insertRule(user, sheet.cssRules.length)
    sheet.insertRule(promptUser, sheet.cssRules.length)
    sheet.insertRule(prompt, sheet.cssRules.length)
    sheet.insertRule(banner, sheet.cssRules.length)
    sheet.insertRule(link, sheet.cssRules.length)
    sheet.insertRule(linkHighlight, sheet.cssRules.length)
    sheet.insertRule(linkTextHighlight, sheet.cssRules.length)
    sheet.insertRule(commandHighlight, sheet.cssRules.length)
    sheet.insertRule(keys, sheet.cssRules.length)
    sheet.insertRule(scrollbar, sheet.cssRules.length)

    // Sidebar specific styles (Theme Colors only)
    // Layout is handled in style.css
    const sidebar = `#sidebar { border-left: none; background: transparent; }`;
    const actionBtn = `.action-btn { color: ${colors.prompt.default}; border: 1px solid ${colors.border.color}; }`;
    const actionBtnHover = `.action-btn:hover { background: ${colors.border.color}; color: ${colors.background} }`;

    sheet.insertRule(sidebar, sheet.cssRules.length);
    sheet.insertRule(actionBtn, sheet.cssRules.length);
    sheet.insertRule(actionBtnHover, sheet.cssRules.length);

    // Window System Variables
    const root = document.documentElement;
    root.style.setProperty('--bg', colors.background);
    root.style.setProperty('--text', colors.foreground);
    root.style.setProperty('--border', colors.border.color);
    root.style.setProperty('--bar-title-color', barTitleColor);
    root.style.setProperty('--win-bg', hexToRgba(colors.background, 0.95));
    root.style.setProperty('--win-border', colors.border.color);
    root.style.setProperty('--win-title-color', hexToRgba(colors.foreground, 0.9));
    root.style.setProperty('--win-scrollbar-thumb', colors.border.color);
    root.style.setProperty('--win-scrollbar-thumb-hover', colors.banner);
    root.style.setProperty('--win-active-border', colors.banner); // Using banner/accent color for active state
    root.style.setProperty('--win-active-border-soft', hexToRgba(colors.banner, 0.45));
    root.style.setProperty('--win-active-glow', hexToRgba(colors.banner, 0.16));
    root.style.setProperty('--win-controls-hover', colors.border.color);
    root.style.setProperty('--prompt-default', colors.prompt.default);
    root.style.setProperty('--prompt-user', colors.prompt.user);
    root.style.setProperty('--prompt-host', colors.prompt.host);

    // Folder Icon Color (matches banner/accent)
    root.style.setProperty('--folder-color', colors.banner);
}

// Initial set
setTheme(builtInThemes.default);
