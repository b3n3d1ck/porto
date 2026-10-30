# Abraham Benedick — Portfolio

Personal portfolio site. Security research, web development, and a bit of creative work, all in one place. Built as a single-page React app with motion-driven transitions and a light/dark theme that follows the system by default.

**Live:** [benedick.vercel.app](https://benedick.vercel.app/)

## Stack

- **React 18** + **TypeScript**
- **Vite** for dev server and build
- **Tailwind CSS** for styling
- **Framer Motion** for transitions and scroll animations

## Project layout

```
src/
  App.tsx              main app + sections
  index.tsx            entry point
  index.css            global styles
  types.ts             shared types
  data/
    constants.ts       profile, skills, projects, experience
    github-projects.json   pinned repos pulled into Projects
public/
  favicon.svg
  robots.txt
```

Content lives in `src/data/constants.ts` — profile info, skills, experience, education, and the handwritten project entries. GitHub projects are merged in from `src/data/github-projects.json`.

## Running locally

Prerequisites: Node.js 18+.

```bash
# install
npm install

# dev server (http://localhost:5173)
npm run dev

# production build
npm run build

# preview the build
npm run preview
```

## Deploy

Deploys to Vercel straight from `main`. Response headers (including `X-Robots-Tag: noindex`) are set in `vercel.json`.

## License

Personal project. All content and assets belong to Abraham Benedick.
