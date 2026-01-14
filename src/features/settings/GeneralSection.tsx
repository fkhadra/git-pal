import { useSuspenseQuery } from "@tanstack/react-query";
import { Keyboard, Palette } from "lucide-react";
import commands from "~/commands";
import { Button, Hr, ThemePicker } from "~/components";
import { FormControl, Label, Switch } from "~/components/Form";
import { AutoStart } from "./AutoStart";
import { GlobalShortcut } from "./GlobalShortcut";
import { Section } from "./Section";

export function GeneralSection() {
	const {
		data: { autoStartEnabled },
	} = useSettingsQuery();

	return (
		<>
			<AutoStart autoStartEnabled={autoStartEnabled} />
			<Updater />
			<Hr />
			<Section icon={Palette} title="Theme">
				<ThemePicker />
			</Section>
			<Hr />
			<Section icon={Keyboard} title="Hotkey">
				<GlobalShortcut />
			</Section>
		</>
	);
}

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

function Updater() {
	return (
		<FormControl className="flex-row items-center">
			<Switch
			// className="ml-auto"
			// checked={isEnabled}
			/>
			<Label className="font-normal">Check for updates automatically</Label>
			<Button className="ml-auto" size="sm">
				Check for updates...
			</Button>
		</FormControl>
	);
}
