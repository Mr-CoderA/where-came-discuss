import type { ThemePreference } from "@asad-architect/types";

const THEME_ATTRIBUTE = "data-theme";

export function readDocumentTheme(root: ParentNode = document.documentElement): ThemePreference | undefined {
  if (!(root instanceof Element)) {
    return undefined;
  }
  const value = root.getAttribute(THEME_ATTRIBUTE);
  if (value === "light" || value === "dark") {
    return value;
  }
  return undefined;
}

export function applyDocumentTheme(theme: ThemePreference, root: HTMLElement = document.documentElement): void {
  root.setAttribute(THEME_ATTRIBUTE, theme);
}

export function clearDocumentTheme(root: HTMLElement = document.documentElement): void {
  root.removeAttribute(THEME_ATTRIBUTE);
}
