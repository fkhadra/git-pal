import { MonitorCog, Moon, Sun } from "lucide-react";
import { useState } from "react";
import commands from "~/commands";
import { useAppContext } from "~/common";
import { themeSwitcher } from "~/libs/utils";
import type { settings } from "~/models";

export function ThemePicker() {
	const appContext = useAppContext();
	const [theme, setTheme] = useState(appContext.theme);

	return (
		<fieldset>
			<legend className="sr-only">Select a theme</legend>

			<div className="grid grid-cols-3 gap-4">
				{["light", "dark", "system"].map((v) => (
					<label
						key={v}
						htmlFor={v}
						className="has-checked:border-primary hover:has-checked:border-primary dark:bg-input bg-background has-checked:bg-primary/15 cursor-pointer rounded-md border-2 border-gray-300 p-4 hover:border-slate-400 dark:border-gray-500 dark:hover:border-slate-50"
					>
						<input
							type="radio"
							className="peer absolute appearance-none"
							id={v}
							value={v}
							onChange={(e) => {
								if (e.target.checked) {
									themeSwitcher(v);
									setTheme(v);
									commands.updateSetting({
										theme: v as settings.Theme,
									});
								}
							}}
							checked={v === theme}
						/>
						<div className="peer-checked:text-primary flex flex-col items-center gap-2 text-center capitalize">
							{v === "light" && <Sun />}
							{v === "dark" && <Moon />}
							{v === "system" && <MonitorCog />}
							<span>{v}</span>
						</div>
					</label>
				))}
			</div>
		</fieldset>
	);
}
