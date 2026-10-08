import path from "node:path";

import { defineConfig } from "@rspress/core";

const REPOSITORY_URL = "https://github.com/fkhadra/git-pal";

export default defineConfig({
  root: "docs",
  // served from GitHub Pages, https://fkhadra.github.io/git-pal/
  base: "/git-pal/",
  title: "Git Pal",
  description: "GitHub in your flow, not in your way",
  icon: "/icon.png",
  logo: "/icon.png",
  logoText: "Git Pal",
  globalStyles: path.join(__dirname, "styles/global.css"),
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/installation" },
      { text: "Download", link: `${REPOSITORY_URL}/releases/latest` },
    ],
    socialLinks: [{ icon: "github", mode: "link", content: REPOSITORY_URL }],
    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Installation", link: "/guide/installation" },
            { text: "Getting started", link: "/guide/getting-started" },
          ],
        },
        {
          text: "Features",
          items: [
            { text: "Command palette", link: "/guide/command-palette" },
            { text: "Code review", link: "/guide/code-review" },
            {
              text: "Menu bar, Dock and updates",
              link: "/guide/tray-and-updates",
            },
            { text: "Settings", link: "/guide/settings" },
          ],
        },
      ],
    },
  },
  builderConfig: {
    resolve: {
      // the app's sources, imported as in the app
      alias: { "~": path.join(__dirname, "../src") },
    },
  },
});
