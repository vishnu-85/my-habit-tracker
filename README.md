# My Habit Tracker

A lightweight, single-file 7-day habit tracker built with HTML, CSS, and vanilla JavaScript. It runs directly in any modern web browser with zero setup, no build tools, and automatic local persistence.

## Features

- **7-Day Weekly Grid (`Mon`–`Sun`):** Track daily check-ins across the week with an automatic highlight on the current day.
- **Custom Weekly Goals & Streaks:** Set a weekly target (1–7 days/week) for each habit, view consecutive-day streak badges, and get a subtle confetti and chime celebration when you hit a goal.
- **Progress Overview & Chart:** Monitor overall weekly goal completion with a live progress bar, summary stats (**Goals Met**, **Best Streak**, **Total Check-ins**), and an interactive **Check-ins by Day** bar chart powered by [Chart.js](https://www.chartjs.org/).
- **Categories, Search & Quick Actions:** Organize habits into `Health`, `Learning`, `Personal`, or `Focus`, filter by category, search by habit name or note, and mark all visible habits complete for today with **Check All Today**.
- **Inline Editing, Notes & Reordering:** Rename habits inline, attach quick per-habit notes, reorder items (`↑` / `↓`), delete habits, or clear checkmarks with **Reset Week**.
- **Weekly Reflection:** Jot down end-of-week thoughts in the built-in reflection box, saved automatically alongside your habits.
- **Dark Mode & Sound Toggle:** Switch between light and dark themes and toggle synthesized Web Audio feedback on or off.
- **Local Storage & JSON Backup:** Automatically saves your habits, theme, sound preference, and reflection in `localStorage`, with **Export** (`habits-backup.json`) and **Import** buttons for portable backups.

## Keyboard Shortcuts

- `/` — Focus the search bar
- `n` — Focus the new habit input
- `d` — Toggle dark mode

## Getting Started

1. Download or clone this repository.
2. Open `habit_tracker.html` in any modern web browser.
3. Start checking off the starter habits or add your own—all changes save automatically in your browser.

## Tech Stack

- **Core:** HTML5, CSS3 (CSS custom properties), Vanilla JavaScript (ES6+)
- **Storage & Audio:** Browser `localStorage` and Web Audio API
- **Libraries (via CDN):** [Chart.js](https://www.chartjs.org/) (`4.4.1`) and [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) (`1.9.3`)
