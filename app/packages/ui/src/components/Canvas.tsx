import type { ReactNode } from "react";
import type { Persona, ThemePreference } from "@asad-architect/types";

export interface CanvasProps {
  readonly theme?: ThemePreference;
  readonly persona?: Persona;
  readonly children: ReactNode;
}

/**
 * Viewport host that publishes theme via a data attribute for the CSS cascade.
 */
export function Canvas({ theme, persona = "asad-architect", children }: CanvasProps): ReactNode {
  return (
    <div data-canvas="" data-persona={persona} {...(theme ? { "data-theme": theme } : {})}>
      {children}
    </div>
  );
}
