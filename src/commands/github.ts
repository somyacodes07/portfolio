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

// Green palette for active contributions (levels 1–4).
// Level 0 uses the current theme's --border via a CSS class instead of inline color.
const ACTIVE_LEVEL_COLORS = [
  '', // placeholder – level 0 handled by class
  '#0E4429', // Level 1 – low
  '#006D32', // Level 2 – medium-low
  '#26A641', // Level 3 – medium-high
  '#39D353', // Level 4 – high
];

const LEVEL_LABELS = ['None', 'Low', 'Med', 'High', 'Max'];

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
  const SPACE = '&nbsp;';
  const BLOCK = '█';

  // ── Header ──
  lines.push('<br>');
  lines.push(
    `${SPACE.repeat(2)}<span class="gh-graph-header">` +
    `<i class='fa-brands fa-github'></i>${SPACE}GitHub Contributions</span>`
  );
  lines.push(
    `${SPACE.repeat(2)}<span class="gh-graph-dim">` +
    `${data.totalContributions.toLocaleString()} contributions in the last year</span>`
  );
  lines.push('<br>');

  // ── Determine how many weeks to show ──
  const maxWeeks = Math.min(data.weeks.length, 52);
  const weeksToShow = data.weeks.slice(-maxWeeks);

  // ── Month labels row ──
  const monthCells: string[] = new Array(weeksToShow.length).fill('');
  let lastMonth = -1;

  for (let w = 0; w < weeksToShow.length; w++) {
    const firstDay = weeksToShow[w].contributionDays[0];
    if (firstDay) {
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        monthCells[w] = MONTH_NAMES[month];
      }
    }
  }

  let monthRow = SPACE.repeat(6);
  let charBudget = 0;

  for (let w = 0; w < monthCells.length; w++) {
    if (charBudget > 0) {
      charBudget--;
      continue;
    }
    if (monthCells[w]) {
      monthRow += `<span class="gh-graph-dim" style="font-size:0.82em;">${monthCells[w]}</span>`;
      charBudget = 1;
    } else {
      monthRow += SPACE.repeat(2);
    }
  }
  lines.push(monthRow);

  // ── Grid rows (7 days: Sun–Sat) ──
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    let row = SPACE.repeat(2);

    const dayLabel = DAY_LABELS[dayOfWeek];
    if (dayLabel) {
      row += `<span class="gh-graph-dim" style="font-size:0.82em;">${dayLabel}</span>${SPACE}`;
    } else {
      row += SPACE.repeat(4);
    }

    for (let w = 0; w < weeksToShow.length; w++) {
      const day = weeksToShow[w].contributionDays[dayOfWeek];
      if (day) {
        const level = getContributionLevel(day.contributionCount);
        const tooltip = `${day.date}: ${day.contributionCount} contribution${day.contributionCount !== 1 ? 's' : ''}`;

        if (level === 0) {
          // Use theme-aware class for empty cells so they're always visible
          row += `<span class="gh-cell-empty" title="${escapeHTML(tooltip)}">${BLOCK}</span>` + SPACE;
        } else {
          row += `<span style="color:${ACTIVE_LEVEL_COLORS[level]};" title="${escapeHTML(tooltip)}">${BLOCK}</span>` + SPACE;
        }
      } else {
        row += SPACE.repeat(2);
      }
    }

    lines.push(row);
  }

  // ── Legend ──
  lines.push('');
  let legendRow = SPACE.repeat(6);
  legendRow += `<span class="gh-graph-dim" style="font-size:0.82em;">Less</span>${SPACE}`;
  legendRow += `<span class="gh-cell-empty" title="${LEVEL_LABELS[0]}">${BLOCK}</span>` + SPACE;
  for (let i = 1; i < ACTIVE_LEVEL_COLORS.length; i++) {
    legendRow += `<span style="color:${ACTIVE_LEVEL_COLORS[i]};" title="${LEVEL_LABELS[i]}">${BLOCK}</span>` + SPACE;
  }
  legendRow += `<span class="gh-graph-dim" style="font-size:0.82em;">More</span>`;
  lines.push(legendRow);

  // ── Stats row ──
  lines.push('');
  const stats = computeStats(data);
  lines.push(
    `${SPACE.repeat(2)}<span style="color:#39D353;">▲</span> ` +
    `<span class="gh-graph-text">Current streak:</span> ` +
    `<span style="color:#39D353;font-weight:600;">${stats.currentStreak} days</span>` +
    `${SPACE.repeat(4)}` +
    `<span class="gh-graph-accent">●</span> ` +
    `<span class="gh-graph-text">Longest streak:</span> ` +
    `<span class="gh-graph-accent" style="font-weight:600;">${stats.longestStreak} days</span>` +
    `${SPACE.repeat(4)}` +
    `<span style="color:#FFA657;">◆</span> ` +
    `<span class="gh-graph-text">Best day:</span> ` +
    `<span style="color:#FFA657;font-weight:600;">${stats.bestDay.count} contributions</span>`
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
