import { openUrl } from "@tauri-apps/plugin-opener";

export function createPAT() {
  openUrl(
    "https://github.com/settings/tokens/new?description=Git Pal&scopes=repo,read:org,gist,read:user,user:email&default_expires_at=none",
  );
}
