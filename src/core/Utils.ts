
export function escapeHTML(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

interface SanitizeUrlOptions {
    allowRelative?: boolean;
    allowMailto?: boolean;
}

export function sanitizeUrl(raw: string, options: SanitizeUrlOptions = {}): string | null {
    const { allowRelative = true, allowMailto = false } = options;
    const value = raw.trim();
    if (!value) return null;

    // Prevent protocol-relative URLs (e.g. //evil.com)
    if (value.startsWith("//")) return null;

    if (allowRelative) {
        const isRelative =
            value.startsWith("/") ||
            value.startsWith("./") ||
            value.startsWith("../") ||
            value.startsWith("#");

        if (isRelative) return value;
    }

    try {
        const parsed = new URL(value);
        const protocol = parsed.protocol.toLowerCase();
        const allowed = allowMailto
            ? new Set(["https:", "http:", "mailto:"])
            : new Set(["https:", "http:"]);

        if (!allowed.has(protocol)) return null;
        return parsed.href;
    } catch {
        return null;
    }
}

export function hexToRgba(hex: string, alpha: number): string {
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return 'rgba(13, 17, 23, ' + alpha + ')'; // Default fallback
}
