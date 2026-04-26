import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// IMPORTANT: change `base` to "/<your-repo-name>/" before deploying to GitHub Pages.
export default defineConfig({
  base: "/project-template/",
  plugins: [react()],
});
