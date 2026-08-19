import { useEffect, type ReactElement, type ReactNode } from "react";
import { applyDocumentTheme, Canvas } from "@asad-architect/ui";
import { useClientState } from "../state/store.js";

export function Folio({ children }: { readonly children: ReactNode }): ReactElement {
  const { config } = useClientState();

  useEffect(() => {
    applyDocumentTheme(config.theme);
  }, [config.theme]);

  return (
    <Canvas theme={config.theme} persona="asad-architect">
      <div data-ecs="world" data-layout="folio">
        {children}
      </div>
    </Canvas>
  );
}
