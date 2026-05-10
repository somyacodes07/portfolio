import command from '../../config.json';
import { escapeHTML } from '../core/Utils';

// ─── Types ──────────────────────────────────────────────────────────

interface ContributionDay {
  date: string;
  contributionCount: number;
  color: string;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface GitHubContributionData {
  totalContributions: number;
  weeks: ContributionWeek[];
}

// ─── Color Mapping ──────────────────────────────────────────────────

const LEVEL_LABELS = ['None', 'Low', 'Med', 'High', 'Max'];

// CSS classes for each level – colors set via CSS variables so they adapt to theme
const LEVEL_CLASSES = [
  'gh-cell-empty', // Level 0
  'gh-cell-1',     // Level 1 – low
  'gh-cell-2',     // Level 2 – medium-low
  'gh-cell-3',     // Level 3 – medium-high
  'gh-cell-4',     // Level 4 – high
];

function getContributionLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

// ─── Month Labels ───────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// ─── Render Functions ───────────────────────────────────────────────

function renderContributionGraph(data: GitHubContributionData): string[] {
  const lines: string[] = [];
  const SP = '&nbsp;';
  const BLOCK = '█';

  // ── Header ──
  lines.push('<br>');
  lines.push(
    `${SP.repeat(2)}<span class="gh-graph-header">` +
    `<i class='fa-brands fa-github'></i>${SP}GitHub Contributions</span>`
  );
  lines.push(
    `${SP.repeat(2)}<span class="gh-graph-dim">` +
    `${data.totalContributions.toLocaleString()} contributions in the last year</span>`
  );
  lines.push('<br>');

  // ── Weeks to render ──
  const maxWeeks = Math.min(data.weeks.length, 52);
  const weeksToShow = data.weeks.slice(-maxWeeks);

  // Each cell is rendered as a fixed-width inline-block to guarantee alignment.
  const cell = (content: string, cls?: string, title?: string) =>
    `<span class="gh-cell${cls ? ' ' + cls : ''}" ${title ? 'title="' + title + '"' : ''}>${content}</span>`;

  // ── Month labels row ──
  // Determine which week index each month first appears at
  const monthAtWeek: (string | null)[] = new Array(weeksToShow.length).fill(null);
  let lastMonth = -1;
  let lastLabelWeek = -10;

  for (let w = 0; w < weeksToShow.length; w++) {
    const firstDay = weeksToShow[w].contributionDays[0];
    if (firstDay) {
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        if ((w - lastLabelWeek) >= 3) {
          // Place label only if 3+ cells from last to avoid collisions
          monthAtWeek[w] = MONTH_NAMES[month];
          lastLabelWeek = w;
        }
        lastMonth = month;
      }
    }
  }

  // Gutter = 4 cells wide (to fit "Mon" + padding)
  const GUTTER_CELLS = 4;
  let monthRow = '';
  for (let g = 0; g < GUTTER_CELLS; g++) monthRow += cell(SP);

  for (let w = 0; w < weeksToShow.length; w++) {
    const label = monthAtWeek[w];
    if (label) {
      // Month label spans 2 cells wide
      monthRow += cell(label, 'gh-cell-wide gh-graph-dim', undefined);
      w++; // consumed 2 cells
      if (w >= weeksToShow.length) break;
    } else {
      monthRow += cell(SP);
    }
  }
  lines.push(monthRow);

  // ── Grid rows (7 days: Sun–Sat) ──
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    let row = '';

    // Day label – fixed width gutter (4 cells)
    const dayLabel = DAY_LABELS[dayOfWeek];
    if (dayLabel) {
      row += cell(SP);
      row += cell(dayLabel, 'gh-cell-wide gh-graph-dim', undefined);
      row += cell(SP);
    } else {
      for (let g = 0; g < GUTTER_CELLS; g++) row += cell(SP);
    }

    // Contribution cells
    for (let w = 0; w < weeksToShow.length; w++) {
      const day = weeksToShow[w].contributionDays[dayOfWeek];
      if (day) {
        const level = getContributionLevel(day.contributionCount);
        const cls = LEVEL_CLASSES[level];
        const tooltip = `${day.date}: ${day.contributionCount} contribution${day.contributionCount !== 1 ? 's' : ''}`;
        row += cell(BLOCK, cls, escapeHTML(tooltip));
      } else {
        row += cell(SP);
      }
    }

    lines.push(row);
  }

  // ── Legend ──
  lines.push('');
  let legendRow = '';
  for (let g = 0; g < GUTTER_CELLS; g++) legendRow += cell(SP);
  
  legendRow += `<span class="gh-graph-dim" style="font-size:0.82em; margin-right: 4px;">Less</span>`;
  for (let i = 0; i < LEVEL_CLASSES.length; i++) {
    legendRow += cell(BLOCK, LEVEL_CLASSES[i], LEVEL_LABELS[i]);
  }
  legendRow += `<span class="gh-graph-dim" style="font-size:0.82em; margin-left: 4px;">More</span>`;
  lines.push(legendRow);

  // ── Stats row ──
  lines.push('');
  const stats = computeStats(data);
  lines.push(
    `${SP.repeat(2)}<span class="gh-cell-4">▲</span> ` +
    `<span class="gh-graph-text">Current streak:</span> ` +
    `<span class="gh-cell-4" style="font-weight:600">${stats.currentStreak} days</span>` +
    `${SP.repeat(4)}` +
    `<span class="gh-graph-accent">●</span> ` +
    `<span class="gh-graph-text">Longest streak:</span> ` +
    `<span class="gh-graph-accent" style="font-weight:600">${stats.longestStreak} days</span>` +
    `${SP.repeat(4)}` +
    `<span class="gh-graph-warm">◆</span> ` +
    `<span class="gh-graph-text">Best day:</span> ` +
    `<span class="gh-graph-warm" style="font-weight:600">${stats.bestDay.count} contributions</span>`
  );

  lines.push('<br>');
  return lines;
}

function computeStats(data: GitHubContributionData) {
  const allDays: ContributionDay[] = [];
  for (const week of data.weeks) {
    for (const day of week.contributionDays) {
      allDays.push(day);
    }
  }

  // Current streak (from most recent day backwards)
  let currentStreak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].contributionCount > 0) {
      currentStreak++;
    } else {
      // Allow skipping today if it's 0 (day might not be over)
      if (i === allDays.length - 1) continue;
      break;
    }
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  for (const day of allDays) {
    if (day.contributionCount > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  // Best single day
  let bestDay = { date: '', count: 0 };
  for (const day of allDays) {
    if (day.contributionCount > bestDay.count) {
      bestDay = { date: day.date, count: day.contributionCount };
    }
  }

  return { currentStreak, longestStreak, bestDay };
}

// ─── Fetch Contributions ────────────────────────────────────────────

async function fetchContributions(username: string): Promise<GitHubContributionData | null> {
  const apiUrl = `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();

    const weeks: ContributionWeek[] = [];
    let totalContributions = 0;

    if (json.contributions && Array.isArray(json.contributions)) {
      const sorted = json.contributions.sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      let currentWeek: ContributionDay[] = [];

      for (const entry of sorted) {
        totalContributions += entry.count;
        currentWeek.push({
          date: entry.date,
          contributionCount: entry.count,
          color: entry.color,
        });

        const dayOfWeek = new Date(entry.date).getDay();
        if (dayOfWeek === 6) {
          weeks.push({ contributionDays: currentWeek });
          currentWeek = [];
        }
      }

      if (currentWeek.length > 0) {
        weeks.push({ contributionDays: currentWeek });
      }
    }

    if (json.total && typeof json.total === 'object') {
      const lastYearKey = Object.keys(json.total).sort().pop();
      if (lastYearKey && json.total[lastYearKey]) {
        totalContributions = json.total[lastYearKey];
      }
    }

    return { totalContributions, weeks };
  } catch (err) {
    console.warn('[GitHub] Failed to fetch contributions:', err);
    return null;
  }
}

// ─── Pre-fetch Cache ────────────────────────────────────────────────

let cachedGraphLines: string[] | null = null;
let fetchPromise: Promise<void> | null = null;

/**
 * Starts fetching GitHub contributions immediately.
 * Call this on page load so data is ready before the user clicks "about".
 */
export function prefetchContributions(): void {
  if (fetchPromise) return; // already in flight

  const githubUrl = command.social.github || '';
  const username = githubUrl.split('/').filter(Boolean).pop() || 'ssgamingop';

  fetchPromise = fetchContributions(username).then((data) => {
    if (data && data.weeks.length > 0) {
      cachedGraphLines = renderContributionGraph(data);
    } else {
      cachedGraphLines = []; // silently omit on error
    }
  });
}

/**
 * Returns cached contribution graph lines, or empty if not yet loaded.
 * Since we pre-fetch on page load, this should be ready by the time
 * the user clicks "about" (typically 1-2 seconds after load).
 */
export function getCachedContributionLines(): string[] {
  return cachedGraphLines ?? [];
}
