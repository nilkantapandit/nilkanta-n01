# Editing the site's content

Everything the site *says* about you lives in **one file: `lib/content.ts`**.
You never need to touch the 3D, screen or terminal code to change text.

## 1. Open the file
VS Code → File → Open Folder → `E:\Git\nilkanta-n01` → open `lib/content.ts`.
(First time on a PC: `git pull` in that folder so you have the latest.)

## 2. Change text — the only rules
It is a list of values. Edit the text **between the quotes** and keep the punctuation around it.

```ts
whatIDo: [
  "First point",          // ← each item: "text in double quotes" followed by a comma
  "Second point",
],
```

- Text goes inside `"double quotes"`. Each item ends with a comma `,`.
- A `"` inside your text must be written `\"` — or just use `'` instead.
- Lists are `[ ... ]`, groups of fields are `{ ... }`. Don't delete those brackets.
- `null` means "not filled in yet" (the site shows *coming soon*). Replace `null` with `"your text"` to fill it.

## 3. Where things show up

| Field in `content.ts` | Shows on |
|---|---|
| `bio`, `glance`, `whatIDo`, `offTheClock`, `mascotLine` | ABOUT ME app · `about` / `cv` command |
| `experience` (each role: `title`, `org`, `period`, `notes`) | DEVOPS app · `experience` command |
| `skills`, `toolbox` | DEVOPS app · `skills` command |
| `projects` (`name`, `summary`, `tags`, `href`) | PROJECTS app · `projects` command |
| `security` | SECURITY app · `security` command |
| `contact` | CONTACT app · `contact` command |
| `gaming`, `artMore`, `location` | `gaming` / `art` / `about` commands (currently `null`) |

### Add a job
Copy an existing block inside `experience: [ ... ]` and change it — newest first:
```ts
{
  title: "DevOps Engineer", org: "Company", period: "Jan 2027 – present",
  notes: [
    "What you did, one sentence per point.",
  ],
},
```

### Add a project
```ts
{
  name: "my-project",
  summary: "One line on what it does.",
  tags: ["docker", "aws"],
  href: "https://github.com/nilkantapandit/my-project",   // optional
},
```

## 4. Check it locally (optional, recommended)
```bash
npm install        # first time only
npm run dev        # open http://localhost:3000, boot the N-01, check your text
```
If you broke the syntax, the page shows an error with the line number — usually a missing quote or comma.

## 5. Publish
```bash
git add lib/content.ts
git commit -m "Update about / experience"
git push
```
Vercel rebuilds automatically; the live site updates in about a minute.
No terminal? Edit `lib/content.ts` straight on github.com (pencil icon → *Commit changes*) — same result.
