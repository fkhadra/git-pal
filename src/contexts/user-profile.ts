import { createContext, useContext } from "react";
import { UserProfile } from "~/models";

export const UserProfileContext = createContext({} as UserProfile);

export function useUserProfile(): UserProfile {
  return useContext(UserProfileContext);
}
