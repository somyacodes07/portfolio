
import command from '../config.json';
import './css/explorer.css';
import { escapeHTML, sanitizeUrl } from './core/Utils';
import { HELP } from "./commands/help";
import { getBanner } from "./commands/banner";
import { getAbout } from "./commands/about"
import { createProject } from "./commands/projects";
import { EDUCATION } from "./commands/education";
import { CERTIFICATIONS } from "./commands/certifications";
import { prefetchContributions } from "./commands/github";

import { createWhoami } from "./commands/whoami";
import { setTheme } from "./core/ThemeManager";
import { builtInThemes, THEME_HELP } from "./commands/themes";
import { getSkills } from "./commands/skills";
import { WindowManager } from './core/WindowManager';
import { InputManager } from './core/InputManager';
import { CommandDispatcher } from './core/CommandDispatcher';
import { ProjectViewer } from './ui/ProjectViewer';
import { CertificateViewer } from './ui/CertificateViewer';

// --- State ---
let mutWriteLines = document.getElementById("write-lines");
let isSudo = false;

let passwordCounter = 0;
let bareMode = false;

// --- DOM Elements ---
const TERMINAL = document.getElementById("terminal");
const PASSWORD = document.getElementById("password-input");
const PASSWORD_INPUT = document.getElementById("password-field") as HTMLInputElement;
const INPUT_HIDDEN = document.getElementById("input-hidden"); // Container for password input visibility toggle
const PRE_HOST = document.getElementById("pre-host");
const PRE_USER = document.getElementById("pre-user");
const HOST = document.getElementById("host");
const USER = document.getElementById("user");
// Needed for references in legacy funcs if any

// --- Config ---
const SUDO_PASSWORD = command.password;
const REPO_LINK = command.repoLink;
const RESUME_LINK = command.resume;
const SOCIAL = command.social;
const THEME_STORAGE_KEY = 'currentTheme';

const OPTIONAL_CONFIG = command as unknown as {
  wallpaper?: string;
  backgroundImage?: string;
};

// --- Managers ---
const windowManager = new WindowManager();
const projectViewer = new ProjectViewer(windowManager);
const certificateViewer = new CertificateViewer(windowManager);
const dispatcher = new CommandDispatcher();

// --- Globals for Legacy Support ---
(window as any).openProjectWindow = projectViewer.openProjectWindow.bind(projectViewer);
(window as any).openProjectExplorer = projectViewer.openProjectExplorer.bind(projectViewer);
(window as any).openCertificateWindow = certificateViewer.openCertificateWindow.bind(certificateViewer);
(window as any).openCertificateExplorer = certificateViewer.openCertificateExplorer.bind(certificateViewer);

// --- Helper Functions ---

const scrollToBottom = () => {
  const HEADER = document.getElementById("content-wrapper");
  if (!HEADER) return
  HEADER.scrollTop = HEADER.scrollHeight;
}

const buildPromptMarkup = () => {
  const safeUser = escapeHTML(command.username);
  const safeHost = escapeHTML(command.hostname);
  return `<span class="prompt"><span class="prompt-user">${safeUser}</span>@<span class="prompt-host">${safeHost}</span>:$ ~ </span>`;
}

const isInteractiveTarget = (target: HTMLElement | null) => {
  if (!target) return false;

  // Don't steal focus when user interacts with windows/media/links/buttons/forms.
  if (target.closest('#window-container')) return true;
  if (target.closest('a, button, input, textarea, select, [role="button"], [contenteditable="true"]')) return true;
  if (target.closest('.clickable')) return true;

  return false;
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const openInNewTab = (rawUrl: string, allowRelative = false) => {
  const safeUrl = sanitizeUrl(rawUrl, { allowRelative });
  if (!safeUrl) return false;
  window.open(safeUrl, '_blank', 'noopener,noreferrer');
  return true;
}

const checkResourceExists = async (rawUrl: string) => {
  const safeUrl = sanitizeUrl(rawUrl, { allowRelative: true });
  if (!safeUrl) return null;

  try {
    const headResponse = await fetch(safeUrl, { method: 'HEAD' });
    if (headResponse.ok) return safeUrl;
  } catch {
    // Fallback handled below.
  }

  try {
    const getResponse = await fetch(safeUrl, { method: 'GET' });
    if (getResponse.ok) return safeUrl;
  } catch {
    return null;
  }

  return null;
}

const createResumeViewerContent = (safeResumeUrl: string): HTMLElement => {
  const shell = document.createElement('div');
  shell.className = 'pdf-viewer-shell';

  const frame = document.createElement('iframe');
  frame.className = 'pdf-viewer-frame';
  frame.title = 'Resume PDF Viewer';
  frame.loading = 'lazy';
  // Keep native PDF rendering but request fit-to-width so content is not clipped.
  frame.src = `${safeResumeUrl}#toolbar=0&navpanes=0&zoom=page-width`;
  frame.setAttribute('allow', 'fullscreen');

  shell.appendChild(frame);
  return shell;
}

const applyWallpaperFromConfig = () => {
  const wallpaperRaw = OPTIONAL_CONFIG.wallpaper || OPTIONAL_CONFIG.backgroundImage || "";
  const safeWallpaper = sanitizeUrl(wallpaperRaw, { allowRelative: true });
  const root = document.documentElement;

  if (!safeWallpaper) {
    root.style.setProperty('--wallpaper-image', 'none');
    root.style.setProperty('--wallpaper-opacity', '0');
    return;
  }

  const escapedWallpaper = safeWallpaper.replace(/"/g, '\\"');
  root.style.setProperty('--wallpaper-image', `url("${escapedWallpaper}")`);
  root.style.setProperty('--wallpaper-opacity', '0.25');
}

function writeLines(message: string[]) {
  message.forEach((item, idx) => {
    displayText(item, idx);
  });
}

function displayText(item: string, idx: number) {
  const renderLine = () => {
    if (!mutWriteLines) return
    const p = document.createElement("p");
    p.innerHTML = item;
    mutWriteLines.parentNode!.insertBefore(p, mutWriteLines);
    scrollToBottom();
  };

  if (prefersReducedMotion) {
    renderLine();
    return;
  }

  setTimeout(renderLine, 40 * idx);
}

function easterEggStyles() {
  const bars = document.getElementById("bars");
  const body = document.body;
  const main = document.getElementById("main");
  const span = document.getElementsByTagName("span");

  if (!bars) return
  bars.innerHTML = "";
  bars.remove()

  if (main) main.style.border = "none";

  body.style.backgroundColor = "black";
  body.style.fontFamily = "VT323, monospace";
  body.style.fontSize = "20px";
  body.style.color = "white";

  for (let i = 0; i < span.length; i++) {
    span[i].style.color = "white";
  }

  const userInput = document.getElementById("user-input");
  if (userInput) {
    userInput.style.backgroundColor = "black";
    userInput.style.color = "white";
    userInput.style.fontFamily = "VT323, monospace";
    userInput.style.fontSize = "20px";
  }
  document.querySelectorAll<HTMLElement>(".prompt").forEach((promptNode) => {
    promptNode.style.color = "white";
  });
}

// --- Password Logic ---

function revertPasswordChanges() {
  if (!INPUT_HIDDEN || !PASSWORD) return
  PASSWORD_INPUT.value = "";
  inputManager.enable();
  INPUT_HIDDEN.style.display = "block";
  PASSWORD.style.display = "none";


  setTimeout(() => {
    inputManager.focus();
  }, 200)
}

function handlePasswordCheck() {
  if (passwordCounter === 2) {
    if (!INPUT_HIDDEN || !mutWriteLines || !PASSWORD) return
    writeLines(["<br>", "INCORRECT PASSWORD.", "PERMISSION NOT GRANTED.", "<br>"])
    revertPasswordChanges();
    passwordCounter = 0;
    return
  }

  if (PASSWORD_INPUT.value === SUDO_PASSWORD) {
    if (!mutWriteLines || !mutWriteLines.parentNode) return
    writeLines(["<br>", "PERMISSION GRANTED.", "Try <span class='command'>'rm -rf'</span>", "<br>"])
    revertPasswordChanges();
    isSudo = true;
    return
  } else {
    PASSWORD_INPUT.value = "";
    passwordCounter++;
  }
}

// --- Command Registration ---

const registerCommands = () => {
  dispatcher.register("help", () => {
    if (bareMode) { writeLines(["maybe restarting your browser will fix this.", "<br>"]); return; }
    writeLines(HELP);
  });

  dispatcher.register("banner", () => {
    if (bareMode) { writeLines(["Welcome to Webterm v1.0.0", "<br>"]); return; }
    writeLines(getBanner());
  });

  dispatcher.register("clear", () => {
    if (!TERMINAL || !mutWriteLines) return
    TERMINAL.innerHTML = "";
    // Re-create write-lines
    const newWriteLines = document.createElement("div");
    newWriteLines.id = "write-lines";
    TERMINAL.appendChild(newWriteLines);
    mutWriteLines = newWriteLines;
  });

  dispatcher.register("whoami", () => {
    if (bareMode) { writeLines([escapeHTML(command.username), "<br>"]); return; }
    writeLines(createWhoami());
  });

  dispatcher.register("about", () => {
    if (bareMode) { writeLines(["Nothing to see here.", "<br>"]); return; }
    writeLines(getAbout());
  });

  dispatcher.register("education", () => {
    if (bareMode) { writeLines(["Stay in school.", "<br>"]); return; }
    writeLines(EDUCATION);
  });

  dispatcher.register("certificates", () => {
    if (bareMode) { writeLines(["No certificates in bare mode.", "<br>"]); return; }
    if (window.innerWidth > 600) {
      certificateViewer.openCertificateExplorer();
      writeLines(["Opening certificate gallery...", "<br>"]);
      return;
    }

    writeLines(CERTIFICATIONS);
  });

  dispatcher.register("certifications", () => {
    if (bareMode) { writeLines(["No certifications in bare mode.", "<br>"]); return; }
    if (window.innerWidth > 600) {
      certificateViewer.openCertificateExplorer();
      writeLines(["Opening certificate gallery...", "<br>"]);
      return;
    }

    writeLines(CERTIFICATIONS);
  });

  dispatcher.register("skills", () => {
    if (bareMode) { writeLines(["Skill issue.", "<br>"]); return; }
    writeLines(getSkills());
  });

  dispatcher.register("repo", () => {
    writeLines(["Redirecting to github.com...", "<br>"]);
    setTimeout(() => {
      if (!openInNewTab(REPO_LINK)) {
        writeLines(["Repository URL is not configured correctly.", "<br>"]);
      }
    }, 500);
  });

  dispatcher.register("linkedin", () => {
    const safeLinkedIn = sanitizeUrl(SOCIAL.linkedin, { allowRelative: false });
    const linkedInText = escapeHTML(SOCIAL.linkedin);
    if (!safeLinkedIn) {
      writeLines(["LinkedIn URL is not configured correctly.", "<br>"]);
      return;
    }
    writeLines([`LinkedIn: <a href='${safeLinkedIn}' target='_blank' rel='noopener noreferrer'>${linkedInText}</a>`, "<br>"]);
  });

  dispatcher.register("github", () => {
    writeLines(["Opening GitHub...", "<br>"]);
    setTimeout(() => {
      if (!openInNewTab(SOCIAL.github)) {
        writeLines(["GitHub URL is not configured correctly.", "<br>"]);
      }
    }, 500);
  });


  dispatcher.register("email", () => {
    const safeMailto = sanitizeUrl(`mailto:${SOCIAL.email}`, { allowRelative: false, allowMailto: true });
    const emailText = escapeHTML(SOCIAL.email);
    if (!safeMailto) {
      writeLines([`Email: ${emailText}`, "<br>"]);
      return;
    }
    writeLines([`Email: <a href='${safeMailto}'>${emailText}</a>`, "<br>"]);
  });

  dispatcher.register("projects", (args) => {
    if (bareMode) {
      writeLines(["I don't want you to break the other projects.", "<br>"]);
      return;
    }

    const isDesktop = window.innerWidth > 600;
    const hasGuiFlag = args.includes('--gui');

    if (isDesktop && !hasGuiFlag) {
      projectViewer.openProjectExplorer();
      writeLines(["Opening Project Explorer...", "<br>"]);
      return;
    }

    if (isDesktop && !args.includes('--gui')) {
      args.push('--gui');
    }

    writeLines(createProject(args));
  });

  dispatcher.register("resume", () => {
    if (bareMode) { writeLines(["resume not found.", "<br>"]); return; }

    checkResourceExists(RESUME_LINK)
      .then((safeResumeUrl) => {
        if (!safeResumeUrl) {
          writeLines(["Resume: Coming Soon...", "<br>"]);
          return;
        }

        if (window.innerWidth <= 600) {
          writeLines(["Opening resume...", "<br>"]);
          setTimeout(() => {
            openInNewTab(safeResumeUrl, true);
          }, 500);
          return;
        }

        writeLines(["Opening resume viewer...", "<br>"]);

        setTimeout(() => {
          const content = createResumeViewerContent(safeResumeUrl);
          windowManager.open('resume', 'Resume.pdf', content, 600, 780);
        }, 500);
      })
      .catch(() => {
        writeLines(["Resume: Coming Soon...", "<br>"]);
      });
  });

  dispatcher.register("sudo", () => {
    if (bareMode) { writeLines(["no.", "<br>"]); return; }
    if (!PASSWORD) return

    inputManager.disable(); // Disable main input

    if (INPUT_HIDDEN) INPUT_HIDDEN.style.display = "none";
    PASSWORD.style.display = "flex";
    setTimeout(() => {
      PASSWORD_INPUT.focus();
    }, 100);
  });

  dispatcher.register("ls", () => {
    if (bareMode) { writeLines(["", "<br>"]); return; }
    if (isSudo) {
      writeLines(["src", "<br>"]);
    } else {
      writeLines(["Permission not granted.", "<br>"]);
    }
  });

  dispatcher.register("rm", (args) => {
    if (bareMode) { writeLines(["don't try again.", "<br>"]); return; }

    // Handle "rm -rf"
    const isRf = args.includes("-rf");

    if (isSudo) {
      if (isRf) {
        if (args.includes("src") && !bareMode) {
          bareMode = true;
          setTimeout(() => {
            if (!TERMINAL) return;
            TERMINAL.innerHTML = "";
            // Restore initial state (empty)
            const newWriteLines = document.createElement("div");
            newWriteLines.id = "write-lines";
            TERMINAL.appendChild(newWriteLines);
            mutWriteLines = newWriteLines;
          });

          easterEggStyles();
          setTimeout(() => { writeLines(["What made you think that was a good idea?", "<br>"]); }, 200);
          setTimeout(() => { writeLines(["Now everything is ruined.", "<br>"]); }, 1200);
        } else if (args.includes("src") && bareMode) {
          writeLines(["there's no more src folder.", "<br>"])
        } else {
          if (bareMode) {
            writeLines(["What else are you trying to delete?", "<br>"])
          } else {
            writeLines(["<br>", "Directory not found.", "type <span class='command'>'ls'</span> for a list of directories.", "<br>"]);
          }
        }
      } else {
        writeLines(["Usage: <span class='command'>'rm -rf &lt;dir&gt;'</span>", "<br>"]);
      }
    } else {
      writeLines(["Permission not granted.", "<br>"]);
    }
  });

  // Alias "rm -rf" to work as a single command string if typed that way?
  // Dispatcher splits by space. "rm -rf" becomes "rm", "-rf".
  // So "rm" handler above covers it.

  dispatcher.register("theme", (args) => {
    if (args.length === 0) {
      writeLines(THEME_HELP);
    } else {
      const themeName = args[0];
      if (builtInThemes[themeName]) {
        setTheme(builtInThemes[themeName]);
        writeLines([`Theme switched to ${escapeHTML(themeName)}`, "<br>"]);
        localStorage.setItem(THEME_STORAGE_KEY, themeName);
      } else {
        writeLines([`Theme '${escapeHTML(themeName)}' not found.`, "<br>", ...THEME_HELP]);
      }
    }
  });
}


// --- Input Manager Init ---

const commandList = ["help", "about", "projects", "whoami", "education", "certificates", "certifications", "skills", "banner", "clear", "resume", "linkedin", "github", "email", "ls", "sudo", "rm -rf", "repo", "theme"];

const inputManager = new InputManager(
  "user-input",
  "ghost-input",
  commandList,
  {
    onCommand: (cmd) => {
      // Echo
      const div = document.createElement("div");
      div.innerHTML = `${buildPromptMarkup()}<span class='output'>${escapeHTML(cmd)}</span>`;
      if (mutWriteLines && mutWriteLines.parentNode) {
        mutWriteLines.parentNode.insertBefore(div, mutWriteLines);
      }

      if (cmd.trim() !== '') {
        const handled = dispatcher.dispatch(cmd);
        if (!handled) {
          if (bareMode) {
            writeLines(["type 'help'", "<br>"]);
          } else {
            writeLines([`Command not found: ${escapeHTML(cmd)}`, "<br>", "Type <span class='command'>'help'</span> for a list of commands.", "<br>"]);
          }
        }
      }
      scrollToBottom();
    },
    onClear: () => {
      if (!TERMINAL || !mutWriteLines) return;
      TERMINAL.innerHTML = "";
      const newWriteLines = document.createElement("div");
      newWriteLines.id = "write-lines";
      TERMINAL.appendChild(newWriteLines);
      mutWriteLines = newWriteLines;
    },
    onAutoScroll: () => scrollToBottom(),
    onInterrupt: () => {
      const currentState = inputManager.getValue();
      const div = document.createElement("div");
      div.innerHTML = `${buildPromptMarkup()}<span class='output'>${escapeHTML(currentState)}^C</span>`;
      if (mutWriteLines && mutWriteLines.parentNode) {
        mutWriteLines.parentNode.insertBefore(div, mutWriteLines);
      }
      inputManager.setValue("");
      scrollToBottom();
    }
  }
);

registerCommands();

const initEventListeners = () => {
  if (HOST) HOST.innerText = command.hostname;
  if (USER) USER.innerText = command.username;
  if (PRE_HOST) PRE_HOST.innerText = command.hostname;
  if (PRE_USER) PRE_USER.innerText = command.username;

  window.addEventListener('load', () => {
    applyWallpaperFromConfig();
    prefetchContributions(); // Start fetching GitHub data immediately
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && builtInThemes[savedTheme]) {
      setTheme(builtInThemes[savedTheme]);
    }
    writeLines(getBanner());
    inputManager.focus();
  });

  PASSWORD_INPUT.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
      handlePasswordCheck();
    }
  });

  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button');

    // Handle Project Gallery Navigation manually if needed? 
    // ProjectViewer adds clicks to its buttons, so they bubble up.
    // But we added e.stopPropagation() there.

    if (button && button.classList.contains('action-btn')) {
      const cmd = button.getAttribute('data-cmd');
      if (cmd === 'theme-random') {
        const themeNames = Object.keys(builtInThemes);
        const currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'default';
        let nextIndex = themeNames.indexOf(currentTheme) + 1;
        if (nextIndex >= themeNames.length) nextIndex = 0;
        const nextTheme = themeNames[nextIndex];
        // Call dispatcher directly for cleaner flow
        dispatcher.dispatch(`theme ${nextTheme}`);
      } else if (cmd) {
        runCommand(cmd);
      }
      return;
    }

    const clickableTarget = target.closest('.clickable') as HTMLElement | null;
    if (clickableTarget) {
      const cmd = clickableTarget.getAttribute('data-command');
      if (cmd) {
        runCommand(cmd);
      }
      return;
    }

    // Only focus terminal input for non-interactive background clicks.
    if (isInteractiveTarget(target)) return;
    inputManager.focus();
  });

  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    const trigger = target?.closest('.clickable') as HTMLElement | null;
    if (!trigger) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;

    const cmd = trigger.getAttribute('data-command');
    if (!cmd) return;

    e.preventDefault();
    runCommand(cmd);
  });
}

function runCommand(cmd: string) {
  const normalized = cmd.trim().toLowerCase();
  const baseCommand = normalized.split(/\s+/)[0] ?? "";
  const windowShortcutCommands = new Set(["projects", "certificates", "certifications", "resume"]);
  const suppressExecutionLine = window.innerWidth > 600 && windowShortcutCommands.has(baseCommand);

  if (!suppressExecutionLine) {
    const p = document.createElement("p");
    p.innerHTML = `<span class="keys">Executing:</span> ${escapeHTML(cmd)}...`;

    if (mutWriteLines && mutWriteLines.parentNode) {
      mutWriteLines.parentNode.insertBefore(p, mutWriteLines);
    }
  }

  const runAfterDelay = () => {
    // Execute the command via dispatcher, BUT we also want to echo it?
    // Actually runCommand acts like typing it.
    // Standard "renderInput" style dispatch?
    // No, runCommand is a direct execution shortcut.
    // It bypasses the "user typed this" echo usually.
    dispatcher.dispatch(cmd);
    scrollToBottom();
  };

  if (suppressExecutionLine || prefersReducedMotion) {
    runAfterDelay();
  } else {
    setTimeout(runAfterDelay, 200);
  }

  inputManager.setValue("");
}

initEventListeners();

// ── Global Skill Tooltip (fixed-position, immune to overflow clipping) ──
const skillTooltip = document.createElement('div');
skillTooltip.id = 'skill-tooltip';
document.body.appendChild(skillTooltip);

document.addEventListener('mouseover', (e) => {
  const tag = (e.target as HTMLElement).closest('.skill-tag[data-tip]') as HTMLElement | null;
  if (!tag) return;

  const tip = tag.getAttribute('data-tip');
  if (!tip) return;

  skillTooltip.textContent = tip;
  skillTooltip.style.display = 'block';

  const rect = tag.getBoundingClientRect();
  const tipRect = skillTooltip.getBoundingClientRect();

  // Position below the tag, clamped to viewport
  let left = rect.left;
  let top = rect.bottom + 8;

  // Prevent overflow off the right edge
  if (left + tipRect.width > window.innerWidth - 12) {
    left = window.innerWidth - tipRect.width - 12;
  }

  // If it would go below viewport, show above instead
  if (top + tipRect.height > window.innerHeight - 12) {
    top = rect.top - tipRect.height - 8;
    // Flip the caret
    skillTooltip.classList.add('flip');
  } else {
    skillTooltip.classList.remove('flip');
  }

  skillTooltip.style.left = `${Math.max(4, left)}px`;
  skillTooltip.style.top = `${top}px`;
});

document.addEventListener('mouseout', (e) => {
  const tag = (e.target as HTMLElement).closest('.skill-tag[data-tip]');
  if (!tag) return;
  skillTooltip.style.display = 'none';
});
