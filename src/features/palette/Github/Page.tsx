import { IconWrapper } from "~/components/IconWrapper";
import { Container } from "../Layout";

export function Page({
	icon,
	children,
}: {
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<Container>
			<IconWrapper>{icon}</IconWrapper>
			<span>{children}</span>
		</Container>
	);
}
