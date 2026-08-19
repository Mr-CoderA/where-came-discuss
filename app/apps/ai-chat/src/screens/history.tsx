import { useCallback, useMemo, useRef, type ChangeEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { HairlineRule, Press } from "@asad-architect/ui";
import { parseSnapshot } from "../state/guards.js";
import {
  createConversation,
  deleteConversation,
  exportArchive,
  importArchive,
  setNotice,
  useClientState,
} from "../state/store.js";
import { Folio } from "../layout/Folio.js";
import { Mast } from "../layout/Mast.js";
import { chatPath } from "../router.js";
import { readCompiledApiOrigin } from "../services/api-origin.js";

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function HistoryScreen(): ReactElement {
  const navigate = useNavigate();
  const { conversations, notice, config } = useClientState();
  const fileRef = useRef<HTMLInputElement>(null);
  const origin = readCompiledApiOrigin();

  const ordered = useMemo(
    () => conversations.slice().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [conversations],
  );

  const onCreate = useCallback(() => {
    const conversation = createConversation();
    navigate(chatPath(conversation.id));
  }, [navigate]);

  const onExport = useCallback(() => {
    const blob = new Blob([exportArchive()], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "asad-architect-archive.json";
    anchor.click();
    URL.revokeObjectURL(href);
  }, []);

  const onImportFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = parseSnapshot(JSON.parse(String(reader.result)) as unknown, config.apiOrigin);
          if (!parsed) {
            setNotice("Archive failed structural validation.");
            return;
          }
          importArchive(parsed);
          setNotice(`Imported ${parsed.conversations.length} sheet(s).`);
        } catch {
          setNotice("Archive was not valid JSON.");
        }
      };
      reader.readAsText(file);
    },
    [config.apiOrigin],
  );

  return (
    <Folio>
      <Mast
        kicker="drawing log"
        title="Sheets on this device"
        trailing={
          <Press kind="accent" onClick={onCreate}>
            New sheet
          </Press>
        }
      />
      <HairlineRule label="Index" />
      <p className="aa-lede">
        History lives in this browser under a single household namespace. There is no account —
        whoever sits at the table can read, write, and erase the log.
      </p>
      {notice ? (
        <p className="aa-notice" role="status">
          {notice}
        </p>
      ) : null}
      <div data-layout="toolbar">
        <Press onClick={onExport} disabled={ordered.length === 0}>
          Export archive
        </Press>
        <Press onClick={() => fileRef.current?.click()}>Import archive</Press>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onImportFile}
        />
      </div>
      {ordered.length === 0 ? (
        <p className="aa-empty">
          No sheets yet. Open a new one and the first sentence becomes the title.
          {!origin ? " This build has no API origin; drafting still works locally." : null}
        </p>
      ) : (
        <ol className="aa-ledger" data-ecs="entity" data-role="ledger" data-layout="ledger">
          {ordered.map((conversation, index) => (
            <li key={conversation.id} className="aa-ledger__row">
              <span className="aa-ledger__index">{String(ordered.length - index).padStart(3, "0")}</span>
              <button
                type="button"
                className="aa-ledger__open aa-lift"
                onClick={() => navigate(chatPath(conversation.id))}
              >
                <span className="aa-ledger__title">{conversation.title}</span>
                <span className="aa-ledger__meta">
                  {conversation.messages.length} mark{conversation.messages.length === 1 ? "" : "s"}
                  <span aria-hidden="true"> · </span>
                  {formatStamp(conversation.updatedAt)}
                </span>
              </button>
              <Press
                className="aa-ledger__erase"
                onClick={() => {
                  deleteConversation(conversation.id);
                  setNotice("Sheet removed from this device.");
                }}
              >
                Erase
              </Press>
            </li>
          ))}
        </ol>
      )}
    </Folio>
  );
}
