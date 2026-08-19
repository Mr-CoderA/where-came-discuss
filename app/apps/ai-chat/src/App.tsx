import type { ReactElement } from "react";
import { Canvas, HairlineRule } from "@asad-architect/ui";
import { STORAGE_NAMESPACE } from "@asad-architect/types";
import { readCompiledApiOrigin } from "./services/api-origin.js";
import { ROUTES } from "./router.js";

export function App(): ReactElement {
  const origin = readCompiledApiOrigin();

  return (
    <Canvas persona="asad-architect">
      <main className="aa-shell">
        <header className="aa-mast">
          <p className="aa-kicker">Workspace · {STORAGE_NAMESPACE}</p>
          <h1 className="aa-title">Asad Architect</h1>
          <p className="aa-lede">
            A household drafting table for long conversations. History and the editor arrive in
            the next build; this host proves the type graph, tokens, and compile-time API origin.
          </p>
        </header>
        <HairlineRule label="Build contract" />
        <dl className="aa-meta">
          <div>
            <dt>History</dt>
            <dd>
              <code className="aa-mono">{ROUTES.history}</code>
            </dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>
              <code className="aa-mono">{ROUTES.chat}</code>
            </dd>
          </div>
          <div>
            <dt>VITE_API_ORIGIN</dt>
            <dd className={origin ? undefined : "aa-origin-unset"}>
              {origin ?? "unset at build (expected for credential-free CI)"}
            </dd>
          </div>
        </dl>
      </main>
    </Canvas>
  );
}
