import { useSuspenseQuery } from "@tanstack/react-query";
import { Keyboard, Palette, Power } from "lucide-react";
import commands from "~/commands";
import { Button, Hr, ThemePicker } from "~/components";
import { useWindowReady } from "~/hooks";
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

	useWindowReady();

	return (
		<main data-with-decoration className="flex h-dvh flex-col gap-7 p-4">
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
		</main>
	);
}
