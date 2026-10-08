import { NoSSR, withBase } from "@rspress/core/runtime";
import {
  Bell,
  Bot,
  Command,
  FileCode,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { lazy, Suspense } from "react";

import appIcon from "~/icon.png";

// the app's components need a browser, never rendered at build time
const HeroDemo = lazy(() => import("./HeroDemo"));

const DOWNLOAD_URL = "https://github.com/fkhadra/git-pal/releases/latest";
const GUIDE_URL = "/guide/installation";

const FEATURES = [
  {
    icon: Command,
    color: "bg-blue-500/10 text-blue-500",
    title: "Command palette",
    description:
      "One shortcut away from any app. Search pull requests, repositories and code, filter by author with @.",
  },
  {
    icon: Bot,
    color: "bg-purple-500/10 text-purple-500",
    title: "AI code review",
    description:
      "Let Claude Code, Codex, Cursor, Antigravity or OpenCode review a pull request in the background.",
  },
  {
    icon: FileCode,
    color: "bg-orange-500/10 text-orange-500",
    title: "Review in context",
    description:
      "Comments land in the diff. Keep, edit or drop them, then submit to GitHub in one go.",
  },
  {
    icon: Bell,
    color: "bg-yellow-500/10 text-yellow-500",
    title: "Menu bar and Dock",
    description:
      "See agents working from the menu bar, and how many reviews wait on you from the Dock.",
  },
  {
    icon: Palette,
    color: "bg-pink-500/10 text-pink-500",
    title: "Make it yours",
    description:
      "Themes, keyboard shortcuts, review templates and the repositories Git Pal covers.",
  },
  {
    icon: ShieldCheck,
    color: "bg-green-500/10 text-green-500",
    title: "Private",
    description:
      "Your token stays in the system keychain, settings stay on your machine. No telemetry.",
  },
];

function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 px-6 pt-20 text-center">
      <img src={appIcon} alt="" className="size-20" />
      <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
        ⚡ Active development
      </span>
      <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
        Git Pal
      </h1>
      <p className="max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
        GitHub in your flow, not in your way. A keyboard-first companion for
        pull requests, with AI reviews built in.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a
          href={DOWNLOAD_URL}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Download
        </a>
        <a
          href={withBase(GUIDE_URL)}
          className="rounded-lg border border-zinc-300 px-5 py-2.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Get started
        </a>
      </div>
      <p className="text-sm text-zinc-500">macOS, Windows and Linux</p>
    </section>
  );
}

function Features() {
  return (
    <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map(({ icon: Icon, color, title, description }) => (
        <article
          key={title}
          className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
        >
          <span className={`w-fit rounded-md p-2 ${color}`}>
            <Icon className="size-5" />
          </span>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </article>
      ))}
    </section>
  );
}

/** Landing page, the setup page's look and its live demo. */
export function Home() {
  return (
    <main className="flex flex-col gap-16">
      <Hero />
      {/* the demo's height, reserved before it loads */}
      <div className="min-h-[452px] px-6 lg:min-h-[588px]">
        <NoSSR>
          <Suspense>
            <HeroDemo />
          </Suspense>
        </NoSSR>
      </div>
      <Features />
    </main>
  );
}
