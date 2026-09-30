/// <reference types="vite/client" />

import type { Settings } from "./models/settings";

export declare global {
  var currentView: "setup" | "settings" | "palette" | "review";
  var appVersion: string;
  var settings: Settings;
}
