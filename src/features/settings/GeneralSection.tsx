import { useSuspenseQuery } from "@tanstack/react-query";
import { Keyboard, Palette } from "lucide-react";
import commands from "~/commands";
import { Hr, ThemePicker } from "~/components";
import { AutoStart } from "./AutoStart";
import { GlobalShortcut } from "./GlobalShortcut";
import { Section } from "./Section";

export function GeneralSection() {
  const {
    data: { autoStartEnabled },
  } = useSettingsQuery();

  return (
    <>
      <AutoStart autoStartEnabled={autoStartEnabled} />
      {/* <Hr /> */}
      <Section icon={Palette} title="Theme">
        <ThemePicker />
      </Section>
      {/* <Hr /> */}
      <Section icon={Keyboard} title="Shortcut">
        <GlobalShortcut />
      </Section>
    </>
  );
}

function useSettingsQuery() {
  return useSuspenseQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return {
        autoStartEnabled: await commands.isAutoStartEnabled(),
      };
    },
  });
}

// function Updater() {
//   const [status, setStatus] = useState("idle");

//   return (
//     <FormControl className="flex-row items-center">
//       <Switch
//       // className="ml-auto"
//       // checked={isEnabled}
//       />
//       <Label className="font-normal">Check for updates automatically</Label>
//       <Button
//         className="relative ml-auto w-46 overflow-hidden"
//         size="sm"
//         onClick={async () => {
//           // try {
//           //   let a = await commands.checkForUpdate();
//           //   console.log(a);
//           // } catch (error) {
//           //   console.log(error);
//           // }

//           setStatus("checking");

//           setTimeout(() => {
//             setStatus("idle");
//           }, 3000);
//         }}
//       >
//         <AnimatePresence mode="popLayout" initial={false}>
//           <motion.span
//             transition={{ type: "spring", duration: 0.3, bounce: 0 }}
//             initial={{ opacity: 0, y: -25 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: 25 }}
//             key={status}
//           >
//             {status === "idle" ? "Check for update..." : <Spinner />}
//           </motion.span>
//         </AnimatePresence>
//       </Button>
//     </FormControl>
//   );
// }
