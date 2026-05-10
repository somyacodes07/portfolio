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

// GitHub-style green palette mapped to terminal block chars
const LEVEL_COLORS = [
  '#21262D', // Level 0 – no contributions (subtle grid)
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
  const LIGHT_BLOCK = '░';

  // ── Header ──
  lines.push('<br>');
  lines.push(
    `${SPACE.repeat(2)}<span style="color:#58A6FF;font-weight:600;">` +
    `<i class='fa-brands fa-github'></i>${SPACE}GitHub Contributions</span>`
  );
  lines.push(
    `${SPACE.repeat(2)}<span style="color:#8B949E;">` +
    `${data.totalContributions.toLocaleString()} contributions in the last year</span>`
  );
  lines.push('<br>');

  // ── Determine how many weeks to show ──
  // Show last ~26 weeks (6 months) on desktop, fewer on mobile
  const maxWeeks = Math.min(data.weeks.length, 52);
  const weeksToShow = data.weeks.slice(-maxWeeks);

  // ── Month labels row ──
  // Each cell is 2 chars wide (block + space). Build a char-cell array first.
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

  // Now build the month row string. Each cell is 2 chars wide.
  let monthRow = SPACE.repeat(6); // offset for day labels
  let charBudget = 0; // chars we've "spent" from previous label spillover

  for (let w = 0; w < monthCells.length; w++) {
    if (charBudget > 0) {
      charBudget--;
      continue; // this cell is consumed by the previous month label
    }

    if (monthCells[w]) {
      monthRow += `<span style="color:#8B949E;font-size:0.82em;">${monthCells[w]}</span>`;
      // Month name is 3 chars, cell is 2 chars, so we spill into the next cell by 1
      // Actually label takes 3 chars but each cell is 2 chars (block + space)
      // We've used 3 chars, so we need to skip ceil(3/2) - 1 = 1 more cell
      charBudget = 1; // skip next cell since the 3-char label overflows
    } else {
      monthRow += SPACE.repeat(2);
    }
  }
  lines.push(monthRow);

  // ── Grid rows (7 days: Sun–Sat) ──
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    let row = SPACE.repeat(2);

    // Day label
    const dayLabel = DAY_LABELS[dayOfWeek];
    if (dayLabel) {
      row += `<span style="color:#8B949E;font-size:0.82em;">${dayLabel}</span>${SPACE}`;
    } else {
      row += SPACE.repeat(4);
    }

    // Contribution cells
    for (let w = 0; w < weeksToShow.length; w++) {
      const day = weeksToShow[w].contributionDays[dayOfWeek];
      if (day) {
        const level = getContributionLevel(day.contributionCount);
        const color = LEVEL_COLORS[level];
        const char = level === 0 ? LIGHT_BLOCK : BLOCK;
        const tooltip = `${day.date}: ${day.contributionCount} contribution${day.contributionCount !== 1 ? 's' : ''}`;
        row += `<span style="color:${color};" title="${escapeHTML(tooltip)}">${char}</span>` + SPACE;
      } else {
        row += SPACE.repeat(2);
      }
    }

    lines.push(row);
  }

  // ── Legend ──
  lines.push('');
  let legendRow = SPACE.repeat(6);
  legendRow += `<span style="color:#8B949E;font-size:0.82em;">Less</span>${SPACE}`;
  for (let i = 0; i < LEVEL_COLORS.length; i++) {
    const char = i === 0 ? LIGHT_BLOCK : BLOCK;
    legendRow += `<span style="color:${LEVEL_COLORS[i]};" title="${LEVEL_LABELS[i]}">${char}</span>` + SPACE;
  }
  legendRow += `<span style="color:#8B949E;font-size:0.82em;">More</span>`;
  lines.push(legendRow);

  // ── Stats row ──
  lines.push('');
  const stats = computeStats(data);
  lines.push(
    `${SPACE.repeat(2)}<span style="color:#39D353;">▲</span> ` +
    `<span style="color:#E6EDF3;">Current streak:</span> ` +
    `<span style="color:#39D353;font-weight:600;">${stats.currentStreak} days</span>` +
    `${SPACE.repeat(4)}` +
    `<span style="color:#58A6FF;">●</span> ` +
    `<span style="color:#E6EDF3;">Longest streak:</span> ` +
    `<span style="color:#58A6FF;font-weight:600;">${stats.longestStreak} days</span>` +
    `${SPACE.repeat(4)}` +
    `<span style="color:#FFA657;">◆</span> ` +
    `<span style="color:#E6EDF3;">Best day:</span> ` +
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
  // Use the public GitHub contributions API (no token needed)
  const apiUrl = `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();

    // Transform API response → our format
    const weeks: ContributionWeek[] = [];
    let totalContributions = 0;

    if (json.contributions && Array.isArray(json.contributions)) {
      // API returns flat array of { date, count, color, intensity }
      // Group by week (7 days each)
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

        // Weeks start on Sunday
        const dayOfWeek = new Date(entry.date).getDay();
        if (dayOfWeek === 6) {
          // Saturday = end of week
          weeks.push({ contributionDays: currentWeek });
          currentWeek = [];
        }
      }

      // Push remaining days
      if (currentWeek.length > 0) {
        weeks.push({ contributionDays: currentWeek });
      }
    }

    // Also try the `total` field if available
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

// ─── Loading Animation ─────────────────────────────────────────────

function renderLoadingState(): string[] {
  const SPACE = '&nbsp;';
  return [
    '<br>',
    `${SPACE.repeat(2)}<span style="color:#58A6FF;">` +
    `<i class='fa-brands fa-github'></i>${SPACE}Fetching GitHub contributions...</span>`,
    '<br>',
  ];
}

function renderError(): string[] {
  const SPACE = '&nbsp;';
  const ghUrl = escapeHTML(command.social.github);
  return [
    '<br>',
    `${SPACE.repeat(2)}<span style="color:#F85149;">` +
    `<i class='fa-solid fa-triangle-exclamation'></i>${SPACE}Could not fetch contribution data.</span>`,
    `${SPACE.repeat(2)}<span style="color:#8B949E;">Visit </span>` +
    `<a href="${ghUrl}" target="_blank" rel="noopener noreferrer">${ghUrl}</a>` +
    `<span style="color:#8B949E;"> to see contributions.</span>`,
    '<br>',
  ];
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Returns loading-state lines immediately, then fetches real data
 * and calls `onDataReady` with the rendered graph lines.
 */
export function getGitHubContributions(
  onDataReady: (lines: string[]) => void
): string[] {
  // Extract username from GitHub URL
  const githubUrl = command.social.github || '';
  const username = githubUrl.split('/').filter(Boolean).pop() || 'ssgamingop';

  // Fire async fetch
  fetchContributions(username).then((data) => {
    if (data && data.weeks.length > 0) {
      onDataReady(renderContributionGraph(data));
    } else {
      onDataReady(renderError());
    }
  });

  // Return loading state immediately
  return renderLoadingState();
}
