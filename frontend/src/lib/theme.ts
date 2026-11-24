/** Light or dark mode, kept in this browser only (concern 14). */
export type ThemeMode = "light" | "dark";

// index.html reads the same key before the app loads, so a dark page never flashes light.
const STORAGE_KEY = "accountable-theme";

/** The saved mode. Anything but "dark", or storage that can't be read, means light. */
export function readTheme(): ThemeMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    // The mode still applies until the page is reloaded.
    console.warn("Couldn't save the color mode", error);
  }
}

export function applyTheme(mode: ThemeMode) {
  if (mode === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}
