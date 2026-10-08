// first, app modules use Tauri globals when imported
import "./tauri-shim";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { SetupDemo } from "~/features/setup/SetupDemo";

// cmdk scrolls the selected item into view, which scrolls the page too
const scrollIntoView = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (options) {
  if (this.closest(".app-scope")) return;

  scrollIntoView.call(this, options);
};

/** The setup page's demo, rendered with the app's dark theme. */
export default function HeroDemo() {
  return (
    <div
      data-theme="dark"
      className="app-scope dark flex justify-center overflow-hidden text-foreground lg:[zoom:1.3]"
    >
      <SetupDemo />
    </div>
  );
}
