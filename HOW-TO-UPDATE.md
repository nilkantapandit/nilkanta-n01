# How to update your website (no coding needed)

Your website **https://nilkanta-n01.vercel.app** is built from the files in this folder.
The master copy lives on **GitHub** (github.com/nilkantapandit/nilkanta-n01).
Whenever the GitHub copy changes, **Vercel rebuilds the website by itself in about a minute.**

So updating the site always means: **change a file → save it to GitHub → wait a minute.**

---

## The only file you need: `lib/content.ts`

Everything the site *says* about you is in this one file:
your bio, "what I do", jobs, skills, projects, security work and contact details.
You never need to touch anything else.

Think of it as a form. Each entry looks like this:

```
"Some sentence about me",
```

**The three rules:**
1. Only change the words **between the double quotes** `" "`.
2. Every line in a list ends with a **comma** `,` — keep it.
3. Don't delete brackets `[ ]` or `{ }`.

To **add** a line, copy an existing line (quotes and comma included), paste it underneath and change the words.

| What you want to change | Look for this word in the file |
|---|---|
| The short bio on the ABOUT ME page | `bio:` |
| "What I do" points | `whatIDo:` |
| Jobs and their bullet points | `experience:` |
| Skills / tools | `skills:` and `toolbox:` |
| Projects | `projects:` |
| Phone, email, LinkedIn | `contact:` |
| What the little mascot says | `mascotLine:` |

---

## Option A — the easiest way (just a web browser, works from any PC)

1. Go to **github.com/nilkantapandit/nilkanta-n01** and sign in.
2. Click the **`lib`** folder, then **`content.ts`**.
3. Click the **pencil icon ✏️** (top right of the file) — "Edit this file".
4. Change the words you want (follow the three rules above).
5. Click the green **Commit changes…** button, write a short note like *"update my bio"*, click **Commit changes** again.
6. Wait about a minute, then refresh **nilkanta-n01.vercel.app**. Done.

If something breaks, nothing is lost: on GitHub open the file, click **History**, and you can see (and copy back) every earlier version.

---

## Option B — editing on this PC with GitHub Desktop (no command line)

One-time setup:
1. Install **GitHub Desktop** from desktop.github.com and sign in with your GitHub account.
2. **File → Add local repository…** → choose this folder (`Documents\NILKANTA_N01\nilkanta-n01`).

Every time you want to change something:
1. In GitHub Desktop click **Fetch origin**, then **Pull origin** if it appears.
   *(This brings in any changes made elsewhere — always do this first.)*
2. Open `lib\content.ts` in Notepad or VS Code, make your change, save.
3. Back in GitHub Desktop you'll see your change listed. Type a short summary
   (e.g. *"add new project"*) in the box at the bottom left and click **Commit to main**.
4. Click **Push origin**. The website updates in about a minute.

---

## Keeping this folder up to date

Changes made from your office PC, on github.com, or by Claude land on GitHub, not automatically here.
To bring this folder up to date: open GitHub Desktop → **Fetch origin** → **Pull origin**.

---

## Want to preview before publishing? (optional)

Only if you've installed Node.js (nodejs.org):
open a terminal in this folder and run `npm install` once, then `npm run dev`,
and open **http://localhost:3000** in your browser. Close the terminal when done.
You can skip this entirely and just use Option A.

---

## Where the other things live

| Thing | Where |
|---|---|
| The 3D model shown on the site | `public/models/nilkanta-n01.glb` (exported from Blender) |
| The Blender master file | `Documents\NILKANTA_N01\NILKANTA_N01_Master.blend` (kept private, not on GitHub) |
| The picture shown when the link is shared | `public/og.jpg` |
| More detailed editing notes | `EDITING.md` |

If anything goes wrong, ask Claude: "update my N-01 site — change X to Y".
