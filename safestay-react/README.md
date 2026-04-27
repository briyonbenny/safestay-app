# SafeStay — Assignment 3 (Client-side, React)

Web Technology — Griffith College Cork. This folder is the **React** deliverable: client-side views, validation, and responsive layout for the SafeStay project (international student housing) described in Assignment 1. **No real HTTP** requests are made, per the assignment brief; mock data and `localStorage` stand in for the planned MERN backend.

**Authors (edit contributions as agreed):** Briyon Benny (3144036), Joyal Joy (3147134), Ayo-oluwa Joshua Olajide (3139178).

**Division of labour:** *Update this before submission, e.g. work evenly split, or e.g. “Briyon: layout + routing, …”.*

**Coversheet:** `Assignment-Cover-Sheet.pdf` in this folder (copy of the team cover sheet from the server project when available). Replace with the final PDF if you update it.

## How to run locally

```bash
cd safestay-react
npm install
npm run dev
```

**Production build & preview**

```bash
npm run build
npm run preview
```

## What is implemented (mapping to the proposal)

| Area | In this app |
|------|-------------|
| Auth (signup / login) | `LoginPage`, `RegisterPage` with email/password rules; `SafeStayContext` session |
| Listings (browse / search / filter) | `ListingsPage` with keyword, type, min/max price (client filter) |
| New listing (owners) | `CreateListingPage` with preview and validation; adds to in-memory list |
| Favourites | `FavouritesPage` + heart/save; IDs in `localStorage` |
| Chat | `ChatPage` local message list (no WebSocket) |
| Report listing | `ListingDetailPage` report modal; client validation + success state |

**VIEW labels for marking:** each page file in `src/pages` starts with a comment naming the **VIEW** and assignment.

## Styling and UX

- Colours: primary `#1E90FF`, secondary `#FFB347`, accent `#27AE60`, background `#F4F4F4` (from the design document).
- Fonts: Roboto (headings) and Open Sans (body), loaded in `index.html`.
- **Responsive:** collapsible nav at narrow widths, grids reflow, touch-friendly targets.
- **Validation:** `src/utils/validation.js` — shared rules for email, password, required fields, price.
- **Backend mapping:** `src/api/clientNotes.js` lists intended future REST routes (not called).

## Deploying on Render (https://render.com)

Render only deploys from a **Git** repository (GitHub, GitLab, or Bitbucket). You need to push the project, then create a static site.

### A. Repository is only the `safestay-react` folder (recommended for this assignment)

1. Create a new empty repo on GitHub (e.g. `safestay-wt3`).
2. Put `package.json`, `src/`, etc. in the **root** of that repo, commit, and push.
3. In [Render Dashboard](https://dashboard.render.com) → **New** → **Static Site**.
4. **Connect** your repository and the branch (usually `main`).
5. **Root Directory:** leave **empty** (or `.`).
6. **Build command:** `npm install && npm run build`
7. **Publish directory:** `dist`
8. Under **Redirects** / **Rewrites** (or in the static site’s **Settings**), add: **Rewrite** `/*` → `/index.html` so React Router works when you open `/listings` or refresh. Or connect the `render.yaml` in this folder via **Blueprints** so the rewrite is applied for you.
9. Click **Create Static Site**. When the build finishes, copy the URL (e.g. `https://safestay-xxx.onrender.com`).

### B. Your Git repo is the parent folder `GroupSafeStayAssignment2SafeStay`

1. Push the whole parent folder to GitHub.
2. In Render → **New** → **Static Site**, connect the repo.
3. **Root Directory:** `safestay-react` (so Render runs `npm` inside that folder).
4. **Build command:** `npm install && npm run build`
5. **Publish directory:** `dist`
6. Add the same **SPA rewrite**: `/*` → `/index.html` (or use the `render.yaml` in the **parent** folder and deploy with **Blueprints**).
7. Save and wait for the deploy. Use the **HTTPS** URL in your coursework.

**Tip:** The parent `../render.yaml` is for layout **B**; the `render.yaml` in this directory is for layout **A** when it sits at the repo root.

## References (add your own)

- React: https://react.dev/
- React Router: https://reactrouter.com/
- Vite: https://vite.dev/
- MDN: forms and client-side validation patterns

*Declare any generative-AI use per the module AI policy and your coversheet; include prompts/screenshots in an appendix as required.*
