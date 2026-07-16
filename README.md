# Rahul & Ankita — 50 Days

A private anniversary site telling your story from May 28 to Day 50.

## Preview locally

Open `index.html` in a browser, or from this folder run:

```bash
npx --yes serve .
```

Then visit the URL it prints (usually `http://localhost:3000`).

## Host on GitHub Pages

1. Create a new GitHub repository (public is required for free Pages on free accounts).
2. Push this folder to the repo (`index.html` should be at the root).
3. On GitHub: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `main` (or `master`), folder: `/ (root)`
4. Wait a minute, then open:
   `https://YOUR_USERNAME.github.io/REPO_NAME/`

### GitHub upload tip

Some videos are large. If GitHub rejects a file over ~100MB, remove that file from `assets/web/` and keep the still photos. The site already skips the largest phone videos (mehndi clips, second song screen recording, movie clip).

## Adding more photos

Drop files into the matching folders under `Images/`, then copy web-friendly versions into `assets/web/` and update `index.html` paths as needed. Convert `.HEIC` to `.jpg` before using them in the browser.
