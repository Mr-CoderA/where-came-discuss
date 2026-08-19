import { useCallback, useId, useRef, type FormEvent, type KeyboardEvent, type ReactElement } from "react";
import { Press } from "@asad-architect/ui";

export function Composer({
  disabled,
  streaming,
  onSubmit,
  onStop,
}: {
  readonly disabled: boolean;
  readonly streaming: boolean;
  readonly onSubmit: (value: string) => void;
  readonly onStop: () => void;
}): ReactElement {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      const node = ref.current;
      if (!node) {
        return;
      }
      const value = node.value.trim();
      if (value.length === 0 || disabled || streaming) {
        return;
      }
      onSubmit(value);
      node.value = "";
      node.style.height = "auto";
    },
    [disabled, onSubmit, streaming],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submit();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        const node = event.currentTarget;
        const start = node.selectionStart;
        const end = node.selectionEnd;
        const next = `${node.value.slice(0, start)}  ${node.value.slice(end)}`;
        node.value = next;
        node.selectionStart = start + 2;
        node.selectionEnd = start + 2;
      }
    },
    [submit],
  );

  const onInput = useCallback(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 320)}px`;
  }, []);

  return (
    <form data-ecs="entity" data-role="composer" data-layout="composer" onSubmit={submit}>
      <label className="aa-editor-label" htmlFor={id}>
        Composition
        <span>Ctrl/⌘ + Enter sends · Tab inserts two spaces</span>
      </label>
      <textarea
        id={id}
        ref={ref}
        className="aa-editor"
        name="draft"
        rows={4}
        spellCheck
        disabled={disabled}
        placeholder="Specify the constraint, then the intent…"
        onKeyDown={onKeyDown}
        onInput={onInput}
      />
      <div data-layout="composer-bar">
        {streaming ? (
          <Press kind="accent" type="button" onClick={onStop}>
            Halt stream
          </Press>
        ) : (
          <Press kind="accent" type="submit" disabled={disabled}>
            Send to table
          </Press>
        )}
      </div>
    </form>
  );
}
