# Project Template

Vite + React starter for D3-loves-react projects, preconfigured for GitHub Pages deployment.

## Use this template

1. On GitHub, click **Use this template → Create a new repository**, name your new repo.
2. Clone it locally and `cd` in.
3. `npm install`

## Per-project setup

After cloning from the template, update these to match the new project:

- **`vite.config.js`** — set `base: "/<your-repo-name>/"`
- **`package.json`** — update the `name` field

## Scripts

- `npm run dev` — start dev server
- `npm run build` — build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run deploy` — build and publish `dist/` to the `gh-pages` branch

## What's included

- React 19 + Vite
- `d3`, `react-icons` as dependencies
- `gh-pages` for one-command deploys
- A `Footer` component (in `src/components/`) wired into `App.jsx`
