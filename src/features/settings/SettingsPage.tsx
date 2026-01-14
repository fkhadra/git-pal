import { Info, LockKeyhole, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useWindowReady } from "~/hooks";
import { cn } from "~/libs/utils";
import { AboutSection } from "./AboutSection";
import { GeneralSection } from "./GeneralSection";
import { SecuritySection } from "./SecuritySection";

export function SettingsPage() {
	const [activeSection, setActiveSection] = useState("#general");

	useWindowReady();
	const currentSection = sections.find((v) => v.href === activeSection);

	return (
		<div data-with-decoration className="grid grid-cols-[168px_1fr]">
			<nav className="mx-auto  w-full h-full p-2 border-r bg-zinc-800 border-r-pink-200/10 flex flex-col gap-2">
				{sections.map((section) => (
					<a
						href={section.href}
						key={section.href}
						onClick={() => {
							setActiveSection(section.href);
						}}
						className={cn(
							"flex px-2 py-2 gap-2 items-center",
							activeSection === section.href && "bg-zinc-200/20 rounded-md",
						)}
					>
						<span className={cn("p-2 rounded-md", section.bg)}>
							<section.icon className={cn("size-4", section.color)} />
						</span>{" "}
						<span>{section.label}</span>
					</a>
				))}
			</nav>
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.div
					transition={
						{
							// type: "tween",
						}
					}
					initial={{ opacity: 0, x: "0%" }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: "100%" }}
					key={currentSection?.href}
					className="flex h-dvh flex-col gap-7 p-4"
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
	{
		label: "Security",
		icon: LockKeyhole,
		href: "#security",
		bg: "bg-yellow-300",
		color: "text-yellow-700",
		component: SecuritySection,
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
