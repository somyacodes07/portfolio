# Webterm - Somyajeet Singh

<p align="center">
  <img alt="Webterm banner" src="res/banner.png" />
</p>

![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)

Terminal-style portfolio website for Somyajeet Singh, focused on AI/ML, full-stack development, and creative systems.

## Features

- Interactive terminal command interface.
- Desktop-style window manager (drag + resize).
- Project Explorer grid (default on desktop for `projects`).
- Project gallery viewer with image/video support.
- Certificate gallery window with local image previews.
- Built-in PDF resume viewer window.
- Sidebar quick actions for common commands.
- Multiple built-in themes (`default`, `matrix`, `dracula`, `gruvbox`, `nord`).
- Mobile-friendly interaction model and sticky action bar.
- Keyboard support:
  - `Tab` auto-complete.
  - `Esc` clears the active input.
  - `ArrowUp` and `ArrowDown` browse command history.

## Commands

- `help` - Show all available commands.
- `about` - Intro and profile links.
- `projects` - Open project explorer.
- `projects --gui` - Force GUI project explorer mode.
- `whoami` - Show current user.
- `education` - Academic background.
- `skills` - Technical stack summary.
- `certificates` / `certifications` - Open the certificate gallery on desktop.
- `resume` - Open resume viewer.
- `linkedin` - Open LinkedIn.
- `github` - Open GitHub.
- `email` - Open mail client.
- `repo` - Open repository.
- `banner` - Print ASCII banner.
- `theme [name]` - Switch theme.
- `clear` - Clear terminal output.

## Configuration

Most customization is done through `config.json`:

- Profile info (`username`, `hostname`, `title`, `aboutGreeting`).
- Social links and resume path.
- Education and skills groups.
- Projects (including screenshots/videos + metadata).
- Certifications.
- Theme colors and prompt styling.

Example:

```json
{
  "title": "Full-Stack Developer | AI/ML",
  "social": {
    "email": "...",
    "github": "...",
    "linkedin": "..."
  },
  "certifications": [
    {
      "name": "Python Certificate",
      "issuer": "HackerRank",
      "date": "Mar 2026",
      "link": "https://www.hackerrank.com/certificates/iframe/...",
      "image": "/projects/certificates/hackerrank-python.jpg"
    },
    {
      "name": "Scientific Computing with Python",
      "issuer": "freeCodeCamp",
      "date": "Feb 2026",
      "link": "https://www.freecodecamp.org/certification/...",
      "image": "/projects/certificates/freecodecamp-python.png"
    }
  ]
}
```

## Easter Eggs

- Try `sudo`.
- Be careful with `rm -rf`.

![Sudo Permission Granted](res/secret.png)

## Local Development

```sh
git clone https://github.com/ssgamingop/portfolio.git
cd portfolio
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## Recent Updates

- Added SentinelIQ as the top featured project.
- Added certification support via `certificates` and `certifications` commands.
- Added desktop certificate previews backed by local image assets.
- Improved Project Explorer hover/focus styling to match active theme colors.
