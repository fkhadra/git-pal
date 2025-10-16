import { createContext, useContext } from "react";
import type { Theme, UserProfile } from "~/models";

type LooseTheme = Theme | (string & {})

interface ContextValue {
	userProfile: UserProfile;
	theme: LooseTheme;
}

export const AppContext = createContext({} as ContextValue);

export function useAppContext(): ContextValue {
	return useContext(AppContext);
}
