import { Typography } from "~/components";
import appIcon from "~/icon.png";

export function AboutSection() {
	return (
		<section className="flex flex-col mx-auto text-center">
			<img src={appIcon} className="w-56" alt="app-logo" />
			<Typography.h3>Git Pal</Typography.h3>
			<span>Version: {globalThis.appVersion}</span>
		</section>
	);
}
