
import command from '../../config.json';

export interface ThemeColors {
    background: string;
    foreground: string;
    banner: string;
    border: {
        visible: boolean;
        color: string;
    };
    prompt: {
        default: string;
        user: string;
        host: string;
        input: string;
    };
    link: {
        text: string;
        highlightColor: string;
        highlightText: string;
    };
    commands: {
        textColor: string;
    };
}

export const builtInThemes: Record<string, ThemeColors> = {
    default: command.colors as ThemeColors,
    matrix: {
        background: "#050b06",
        foreground: "#c8fdd8",
        banner: "#5bff98",
        border: { visible: true, color: "#1f3e2a" },
        prompt: { default: "#7bc595", user: "#8ef9ad", host: "#73d8ff", input: "#dbffe6" },
        link: { text: "#63ee98", highlightColor: "#1f3e2a", highlightText: "#f0fff5" },
        commands: { textColor: "#8fffb0" }
    },
    dracula: {
        background: "#1f2230",
        foreground: "#f4f5f7",
        banner: "#c5a3ff",
        border: { visible: true, color: "#4a4f67" },
        prompt: { default: "#a7adc2", user: "#ff7eb6", host: "#8be9fd", input: "#f8f8f2" },
        link: { text: "#7ad7ff", highlightColor: "#38405d", highlightText: "#f4f7ff" },
        commands: { textColor: "#ffb86c" }
    },
    gruvbox: {
        background: "#1f1b16",
        foreground: "#f2e5bc",
        banner: "#fabd2f",
        border: { visible: true, color: "#5a4b3b" },
        prompt: { default: "#bda98b", user: "#fb6f52", host: "#8ec07c", input: "#f2e5bc" },
        link: { text: "#83a598", highlightColor: "#4a3f34", highlightText: "#fff1c1" },
        commands: { textColor: "#d3869b" }
    },
    nord: {
        background: "#242933",
        foreground: "#E5E9F0",
        banner: "#88C0D0",
        border: { visible: true, color: "#566074" },
        prompt: { default: "#A3B1C9", user: "#A3BE8C", host: "#88C0D0", input: "#ECEFF4" },
        link: { text: "#81A1C1", highlightColor: "#3B4252", highlightText: "#ECEFF4" },
        commands: { textColor: "#B48EAD" }
    }
};

const createThemeHelp = (): string[] => {
    const help: string[] = [];
    help.push("<br>");
    help.push("Usage: <span class='command'>theme [name]</span>");
    help.push("<br>");
    help.push("Available themes:");
    Object.keys(builtInThemes).forEach(t => {
        help.push(`  <span class='command'>${t}</span>`);
    });
    help.push("<br>");
    return help;
}

export const THEME_HELP = createThemeHelp();
