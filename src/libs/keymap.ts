import type { KeyboardEvent } from "react";

export const Keymap: Record<string, string> = {
	Backquote: "`",
	Backslash: "\\",
	BracketLeft: "[",
	BracketRight: "]",
	Comma: ",",
	Equal: "=",
	Minus: "-",
	Period: ".",
	Quote: "'",
	Semicolon: ";",
	Slash: "/",

	Digit0: "0",
	Digit1: "1",
	Digit2: "2",
	Digit3: "3",
	Digit4: "4",
	Digit5: "5",
	Digit6: "6",
	Digit7: "7",
	Digit8: "8",
	Digit9: "9",

	KeyA: "A",
	KeyB: "B",
	KeyC: "C",
	KeyD: "D",
	KeyE: "E",
	KeyF: "F",
	KeyG: "G",
	KeyH: "H",
	KeyI: "I",
	KeyJ: "J",
	KeyK: "K",
	KeyL: "L",
	KeyM: "M",
	KeyN: "N",
	KeyO: "O",
	KeyP: "P",
	KeyQ: "Q",
	KeyR: "R",
	KeyS: "S",
	KeyT: "T",
	KeyU: "U",
	KeyV: "V",
	KeyW: "W",
	KeyX: "X",
	KeyY: "Y",
	KeyZ: "Z",

	Backspace: "Backspace",
	Enter: "Enter",
	Space: "Space",
	Tab: "Tab",
	Delete: "Delete",
	End: "Delete",
	Home: "Home",
	Insert: "Insert",
	PageDown: "PageDown",
	PageUp: "PageUp",
	PrintScreen: "PrintScreen",
	ScrollLock: "ScrollLock",
	Pause: "Pause",
	Escape: "Escape",

	ArrowDown: "ArrowDown",
	ArrowLeft: "ArrowLeft",
	ArrowRight: "ArrowRight",
	ArrowUp: "ArrowUp",

	// Numpad
	Numpad0: "NUM0",
	Numpad1: "NUM1",
	Numpad2: "NUM2",
	Numpad3: "NUM3",
	Numpad4: "NUM4",
	Numpad5: "NUM5",
	Numpad6: "NUM6",
	Numpad7: "NUM7",
	Numpad8: "NUM8",
	Numpad9: "NUM9",
	NumpadAdd: "+",
	NumpadDecimal: ".",
	NumpadDivide: "/",
	NumpadEnter: "ENTER",
	NumpadEqual: "=",
	NumpadMultiply: "*",
	NumpadSubtract: "-",

	F1: "F1",
	F2: "F2",
	F3: "F3",
	F4: "F4",
	F5: "F5",
	F6: "F6",
	F7: "F7",
	F8: "F8",
	F9: "F9",
	F10: "F10",
	F11: "F11",
	F12: "F12",

	// Media
	AudioVolumeDown: "VOLUMEDOWN",
	AudioVolumeUp: "VOLUMEUP",
	AudioVolumeMute: "VOLUMEMUTE",
	MediaPlay: "MEDIAPLAY",
	MediaPause: "MEDIAPAUSE",
	MediaPlayPause: "MEDIAPLAYPAUSE",
	MediaStop: "MEDIASTOP",
	MediaTrackNext: "MEDIATRACKNEXT",
	MediaTrackPrevious: "MEDIATRACKPREV",

	// Ignored
	_CapsLock: "CapsLock",
	_NumLock: "NUMLOCK",
};

export const ModifierSymbol: Record<string, string> = {
	ctrl: "ctrl",
	shift: "⇧",
	alt: "⌥",
	// ⊞ for windows
	cmd: "⌘",
};

export const MainKeySymbol: Record<string, string> = {
	Backspace: "⌫",
	Enter: "↵",
	ArrowUp: "↑",
	ArrowDown: "↓",
	ArrowLeft: "←",
	ArrowRight: "→",
};

export type Shortcut = {
	modifiers: Key[];
	mainKey: Key;
};
export type Key = { symbol: string; value: string };

export function captureShortcut(event: KeyboardEvent<HTMLElement>): Shortcut {
	const modifiers: Key[] = [];

	if (event.shiftKey)
		modifiers.push({ value: "shift", symbol: ModifierSymbol.shift });
	if (event.ctrlKey)
		modifiers.push({ value: "ctrl", symbol: ModifierSymbol.ctrl });
	if (event.metaKey)
		modifiers.push({ value: "cmd", symbol: ModifierSymbol.cmd });
	if (event.altKey)
		modifiers.push({ value: "alt", symbol: ModifierSymbol.alt });

	return {
		modifiers,
		mainKey: {
			symbol: MainKeySymbol[event.code] || Keymap[event.code],
			value: Keymap[event.code],
		},
	};
}

export function shortcutToString(s?: Shortcut) {
	if (!s) return;

	const keys = s?.modifiers.map((v) => v.value);

	if (keys && s.mainKey) {
		keys.push(s.mainKey.value);
	}

	return keys.join("+");
}

export function parseShortcut(s: string) {
	const keys = s.split("+");
	const modifiers: Key[] = [];
	const mainKey: Key = {
		symbol: "",
		value: "",
	};

	for (const key of keys) {
		const modifierSymbol = ModifierSymbol[key];

		if (modifierSymbol) {
			modifiers.push({
				value: key,
				symbol: modifierSymbol,
			});
		} else {
			mainKey.symbol = MainKeySymbol[key] || key;
			mainKey.value = key;
		}
	}

	return { modifiers, mainKey };
}
