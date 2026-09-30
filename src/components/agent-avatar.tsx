import { BotAvatar, type BotAvatarProps } from "bot-avatars";
import { proxy, useSnapshot } from "valtio";

import commands from "~/commands";
import type { settings } from "~/models";

const avatar = proxy<settings.Avatar>({ ...globalThis.settings.avatar });

commands.onSettingChanged((event) => {
  const value = event.payload.settingChanged;
  if ("avatar" in value) Object.assign(avatar, value.avatar);
});

export function useAvatar() {
  return useSnapshot(avatar);
}

export function AgentAvatar({
  color,
  ...props
}: Omit<BotAvatarProps, "type">) {
  const avatar = useAvatar();

  return (
    <BotAvatar
      key={props.paused ? "paused" : "live"}
      type={avatar.type}
      color={color ?? avatar.color}
      {...props}
    />
  );
}
