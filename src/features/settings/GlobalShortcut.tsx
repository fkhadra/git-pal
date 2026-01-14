import { motion } from "motion/react";
import { type KeyboardEvent, useRef, useState } from "react";
import commands from "~/commands";
import { Key } from "~/components";
import { FormControl, Input } from "~/components/Form";
import { useAppContext } from "~/features/shared";
import {
	captureShortcut,
	parseShortcut,
	type Shortcut,
	shortcutToString,
} from "~/libs/keymap";

export function GlobalShortcut() {
	const { settings } = useAppContext();
	const [shortcut, setShortcut] = useState<Shortcut | undefined>(() =>
		parseShortcut(settings.globalShortcut),
	);
	const [isRecording, setIsRecording] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const shouldRevert = useRef(true);

	const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
		shouldRevert.current = true;
		e.preventDefault();

		if (e.code === "Escape") {
			setShortcut(undefined);
			return;
		}

		if (
			e.code === "Enter" &&
			shortcut?.mainKey &&
			shortcut.modifiers.length >= 1
		) {
			try {
				await commands.replaceGlobalShortcut(shortcutToString(shortcut)!);
				shouldRevert.current = false;
				inputRef.current?.blur();
			} catch (error) {
				console.log("Wrong shortcut:", error);
			}
			return;
		}

		const keys = captureShortcut(e);

		setShortcut(keys);
	};

	return (
		<FormControl className="flex-col ">
			<div>
				<span>Show Git Pal</span>
			</div>
			<div className="relative max-w-60">
				<Input
					ref={inputRef}
					onKeyDown={handleKeyDown}
					onFocus={() => setIsRecording(true)}
					onBlur={() => {
						if (shouldRevert.current) {
							setShortcut(parseShortcut(settings.globalShortcut));
						}
						setIsRecording(false);
					}}
				/>
				{shortcut && (
					<div className="flex items-center gap-1 mt-2 absolute left-2 top-0.5">
						{shortcut.modifiers.map((k) => (
							<Key key={k.key}>{k.symbol}</Key>
						))}
						{shortcut.mainKey && <Key>{shortcut.mainKey}</Key>}

						{isRecording && (
							<motion.div
								className="w-0.5 h-5 bg-primary  duration-75 ml-1"
								animate={{ opacity: [0, 1] }}
								transition={{
									repeat: Infinity,
									duration: 0.8,
									repeatType: "loop",
									ease: "linear",
								}}
							/>
						)}
					</div>
				)}
			</div>
			{isRecording && (
				<div className="text-xs mt-1 text-muted-foreground">
					Press desired key combination and press <Key>Enter</Key>
				</div>
			)}
		</FormControl>
	);
}
