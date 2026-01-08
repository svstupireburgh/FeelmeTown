'use client';

import { useEffect } from "react";

type InspectGuardProps = {
  disableContextMenu?: boolean;
  disableShortcuts?: boolean;
};

const KEY_COMBINATIONS = [
  ["Control", "Shift", "I"],
  ["Control", "Shift", "J"],
  ["Control", "Shift", "C"],
  ["Control", "Shift", "K"],
  ["Control", "U"],
  ["F12"],
];

const modifiers = new Set(["Shift", "Control", "Alt", "Meta"]);

export default function InspectGuard({
  disableContextMenu = true,
  disableShortcuts = true,
}: InspectGuardProps) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const pressed = new Set<string>();

    const handleKeyDown = (event: KeyboardEvent) => {
      pressed.add(event.key);

      for (const combo of KEY_COMBINATIONS) {
        if (combo.every((key) => pressed.has(key))) {
          if (disableShortcuts) {
            event.preventDefault();
            event.stopPropagation();
          }
          break;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!modifiers.has(event.key)) {
        pressed.clear();
      } else {
        pressed.delete(event.key);
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (disableContextMenu) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    if (disableShortcuts) {
      window.addEventListener("keydown", handleKeyDown, true);
      window.addEventListener("keyup", handleKeyUp, true);
    }

    if (disableContextMenu) {
      window.addEventListener("contextmenu", handleContextMenu, true);
    }

    return () => {
      if (disableShortcuts) {
        window.removeEventListener("keydown", handleKeyDown, true);
        window.removeEventListener("keyup", handleKeyUp, true);
      }
      if (disableContextMenu) {
        window.removeEventListener("contextmenu", handleContextMenu, true);
      }
    };
  }, [disableContextMenu, disableShortcuts]);

  return null;
}
