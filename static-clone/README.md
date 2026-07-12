# SmartClass — Static HTML/CSS/JS Clone

A pure HTML, CSS, and vanilla JavaScript version of the SmartClass app.
No backend, no build step, no framework. All data lives in the browser's
`localStorage`.

## Run it

Just open `index.html` in a browser. No server needed.

For best results (some browsers restrict `file://`), serve locally:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then open <http://localhost:8000>.

## Pages

- `index.html` — Dashboard (stats, recent feedback, notifications)
- `captain-feedback.html` — Captain cards (click to view their feedback) + submit form
- `seat-planner.html` — 24-seat grid, click to assign/remove students
- `sos.html` — Trigger emergency alerts + history
- `school-rules.html` — Rule cards
- `notifications.html` — Notification list, mark read
- `ai-syllabus.html` — Offline summarizer (heuristic, no API)
- `profile.html` — Edit your name/roll/role
- `student-management.html` — CRUD table for students

## Structure

```
static-clone/
├── css/style.css      # All styles (custom CSS, no framework)
├── js/data.js         # Sample data + localStorage helpers
├── js/app.js          # Shared sidebar/navbar renderer + utils
└── *.html             # One file per page
```

## Reset data

Open the browser console and run:

```js
localStorage.removeItem("smartclass_static_v1"); location.reload();
```

## Notes

- **AI Syllabus** uses a simple offline heuristic (first sentences +
  keyword frequency). No API key, no network call — safe for demos.
- **Auth / roles / realtime** are not part of this static version.
  See the React + Lovable Cloud version in the parent project for those.
