import { proxy, useSnapshot } from "valtio";

const state = proxy({ isManagerOpen: false });

export const templateManager = {
  setOpen(open: boolean) {
    state.isManagerOpen = open;
  },
};

export function useTemplateManagerSnapshot() {
  return useSnapshot(state);
}
