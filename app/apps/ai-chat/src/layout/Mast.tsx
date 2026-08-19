import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Press } from "@asad-architect/ui";
import { STORAGE_NAMESPACE } from "@asad-architect/types";
import { ROUTES } from "../router.js";
import { readCompiledApiOrigin } from "../services/api-origin.js";
import { setTheme, useClientState } from "../state/store.js";

export function Mast({
  kicker,
  title,
  trailing,
}: {
  readonly kicker?: string;
  readonly title: string;
  readonly trailing?: ReactNode;
}): ReactElement {
  const { config } = useClientState();
  const origin = readCompiledApiOrigin();
  const nextTheme = config.theme === "dark" ? "light" : "dark";

  return (
    <header data-ecs="entity" data-role="masthead" data-layout="mast">
      <div data-layout="mast-copy">
        <p className="aa-kicker">
          <Link className="aa-home" to={ROUTES.history}>
            Asad Architect
          </Link>
          <span aria-hidden="true"> · </span>
          {kicker ?? STORAGE_NAMESPACE}
        </p>
        <h1 className="aa-title">{title}</h1>
      </div>
      <div data-layout="mast-tools">
        <p className={origin ? "aa-origin" : "aa-origin aa-origin-unset"}>
          {origin ?? "API origin unset at build"}
        </p>
        <Press kind="plain" onClick={() => setTheme(nextTheme)} aria-label={`Switch to ${nextTheme} register`}>
          {nextTheme === "dark" ? "Night register" : "Day register"}
        </Press>
        {trailing}
      </div>
    </header>
  );
}
