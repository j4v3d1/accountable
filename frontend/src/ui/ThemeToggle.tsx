import { Moon } from "lucide-react";
import { useState } from "react";
import { applyTheme, readTheme, saveTheme, type ThemeMode } from "../lib/theme";
import "./layout.css";

/** The rail's dark mode button: pressed while dark mode is on (R6a). */
export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(readTheme);
  const isDark = mode === "dark";

  function toggle() {
    const next: ThemeMode = isDark ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
    setMode(next);
  }

  return (
    <button
      type="button"
      className="rail-link rail-toggle"
      aria-label="Dark mode"
      aria-pressed={isDark}
      onClick={toggle}
    >
      <Moon size={20} strokeWidth={1.75} aria-hidden="true" className="rail-icon" />
      Dark
    </button>
  );
}
