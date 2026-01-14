import { useState } from "react";
import commands from "~/commands";
import { FormControl, Label, Switch } from "~/components/Form";

export function AutoStart({ autoStartEnabled }: { autoStartEnabled: boolean }) {
	const [isEnabled, setIsEnabled] = useState(autoStartEnabled);
	return (
		<FormControl className="flex-row items-center">
			<Switch
				checked={isEnabled}
				onCheckedChange={async (checked) => {
					try {
						setIsEnabled(checked);
						await (checked
							? commands.enableAutoStart()
							: commands.disableAutoStart());
					} catch (e) {
						console.log(e);
					}
				}}
			/>
			<Label className="font-normal">Launch on login</Label>
		</FormControl>
	);
}
