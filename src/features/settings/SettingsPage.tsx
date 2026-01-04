import { useSuspenseQuery } from "@tanstack/react-query";
import {
	Cog,
	Info,
	Keyboard,
	Lock,
	LockKeyhole,
	Palette,
	Power,
	Settings,
} from "lucide-react";
import { useState } from "react";
import commands from "~/commands";
import { Button, Hr, ThemePicker } from "~/components";
import { useWindowReady } from "~/hooks";
import { cn } from "~/libs/utils";
import { AutoStart } from "./AutoStart";
import { HotKey } from "./HotKey";
import { Section } from "./Section";

function useSettingsQuery() {
	return useSuspenseQuery({
		queryKey: ["settings"],
		queryFn: async () => {
			return {
				autoStartEnabled: await commands.isAutoStartEnabled(),
			};
		},
	});
}

export function SettingsPage() {
	const {
		data: { autoStartEnabled },
	} = useSettingsQuery();
	const [activeSection, setActiveSection] = useState("#general");

	useWindowReady();

	return (
		<div data-with-decoration className="grid grid-cols-[168px_1fr]">
			<nav className="mx-auto  w-full h-full p-2 border-r bg-zinc-800 border-r-pink-200/10 flex flex-col gap-2">
				{sections.map((v) => (
					<a
						href={v.href}
						key={v.href}
						onClick={() => {
							setActiveSection(v.href)
						}}
						className={cn("flex px-2 py-2 gap-2 items-center", activeSection === v.href && "bg-zinc-200/20 rounded-md" )}
					>
						<span className={cn("p-2 rounded-md", v.bg)}>
							<v.icon className={cn("size-4", v.color)} />
						</span>{" "}
						<span>{v.label}</span>
					</a>
				))}
			</nav>
			<div className="flex h-dvh flex-col gap-7 p-4">
				<Section icon={Power} title="Startup">
					<AutoStart autoStartEnabled={autoStartEnabled} />
				</Section>
				<Hr />
				<Section icon={Palette} title="Theme">
					<ThemePicker />
				</Section>
				<Hr />
				<Section icon={Keyboard} title="Hotkey">
					<HotKey />
				</Section>

				<div>
					<span>Test Auth</span>
					<Button
						onClick={() => {
							commands.startAuthFlow();
						}}
					>
						Authorize
					</Button>
				</div>
			</div>
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
	},
	{
		label: "Security",
		icon: LockKeyhole,
		href: "#security",
		bg: "bg-yellow-300",
		color: "text-yellow-700",
	},
	{
		label: "About",
		icon: Info,
		href: "#about",
		bg: "bg-primary",
		color: "text-white",
	},
];
