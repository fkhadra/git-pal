import { Info, LockKeyhole, MessageCircle, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useWindowReady } from "~/hooks";
import { cn } from "cn";
import { AboutSection } from "./AboutSection";
import { FeedbackSection } from "./FeedbackSection";
import { GeneralSection } from "./GeneralSection";
import { SecuritySection } from "./SecuritySection";

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState("#general");

  useWindowReady();
  const currentSection = sections.find((v) => v.href === activeSection);

  return (
    <div
      data-with-decoration
      className="relative grid grid-cols-[168px_1fr] overflow-hidden"
    >
      <nav className="z-10 mx-auto flex h-full w-full flex-col gap-2 border-r border-r-pink-200/10 bg-zinc-800 p-2">
        {sections.map((section) => (
          <a
            href={section.href}
            key={section.href}
            onClick={() => {
              setActiveSection(section.href);
            }}
            className={cn(
              "flex items-center gap-2 px-2 py-2",
              activeSection === section.href && "rounded-md bg-zinc-200/20",
            )}
          >
            <span className={cn("rounded-md p-2", section.bg)}>
              <section.icon className={cn("size-4", section.color)} />
            </span>{" "}
            <span>{section.label}</span>
          </a>
        ))}
      </nav>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          initial={{ opacity: 0, x: "-100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "200%" }}
          key={currentSection?.href}
          transition={{
            bounce: 0,
            duration: 0.2,
          }}
          className="flex h-dvh flex-col gap-7 px-4 py-2"
        >
          {currentSection && <currentSection.component />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const sections = [
  {
    label: "General",
    icon: Settings,
    href: "#general",
    bg: "bg-blue-300",
    color: "text-blue-700",
    component: GeneralSection,
  },
  // {
  //   label: "Monitoring",
  //   icon: Activity,
  //   href: "#monitoring",
  //   bg: "bg-green-300",
  //   color: "text-green-700",
  //   component: MonitoringSection,
  // },
  {
    label: "Security",
    icon: LockKeyhole,
    href: "#security",
    bg: "bg-yellow-300",
    color: "text-yellow-700",
    component: SecuritySection,
  },
  {
    label: "Feedback",
    icon: MessageCircle,
    href: "#feedback",
    bg: "bg-info",
    color: "text-white",
    component: FeedbackSection,
  },
  {
    label: "About",
    icon: Info,
    href: "#about",
    bg: "bg-primary",
    color: "text-white",
    component: AboutSection,
  },
];
