import { createContext, useContext, useRef } from "react";
import { proxy, useSnapshot } from "valtio";
import type { UserProfile } from "~/models";
import type { Settings } from "~/models/settings";

interface ContextValue {
	userProfile: UserProfile;
	settings: Settings;
}

const AppContext = createContext({} as ContextValue);

export function useAppContext() {
	const ctxValue = useContext(AppContext);

	return useSnapshot(ctxValue);
}

export const AppProvider = ({
	children,
	value,
}: {
	children: React.ReactNode;
	value: ContextValue;
}) => {
	const state = useRef(proxy(value)).current;

	return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
};
