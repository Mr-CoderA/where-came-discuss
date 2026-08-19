import { useCallback, useEffect, useRef, type ReactElement } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HairlineRule } from "@asad-architect/ui";
import { DEFAULT_INFERENCE_MODEL, type Message } from "@asad-architect/types";
import { Composer } from "../components/Composer.js";
import { Folio } from "../layout/Folio.js";
import { Mast } from "../layout/Mast.js";
import { ROUTES } from "../router.js";
import {
  ApiOriginMissingError,
  acceptChatJob,
  buildChatRequest,
  consumeTokenStream,
  requireApiOrigin,
} from "../services/chat-client.js";
import { tryConsumeRate } from "../state/rate-limit.js";
import {
  appendMessage,
  getStoreSnapshot,
  patchMessageContent,
  setNotice,
  setStream,
  useClientState,
  useConversation,
} from "../state/store.js";

function roleMark(role: Message["role"]): string {
  if (role === "user") {
    return "U";
  }
  if (role === "assistant") {
    return "A";
  }
  return "S";
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function ChatScreen(): ReactElement {
  const { id } = useParams();
  const navigate = useNavigate();
  const conversation = useConversation(id);
  const { stream, notice } = useClientState();
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const streaming = stream !== null && stream.conversationId === conversation?.id;

  useEffect(() => {
    const node = logRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [conversation?.messages, stream]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStream(null);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!conversation) {
        return;
      }
      if (!tryConsumeRate()) {
        setNotice("Client rate window is full. Wait a minute before another GROQ call.");
        return;
      }

      setNotice(null);
      const user = appendMessage(conversation.id, {
        role: "user",
        content: text,
        model: DEFAULT_INFERENCE_MODEL,
      });
      const assistant = appendMessage(conversation.id, {
        role: "assistant",
        content: "",
        model: DEFAULT_INFERENCE_MODEL,
      });
      setStream({ conversationId: conversation.id, messageId: assistant.id });

      const controller = new AbortController();
      abortRef.current = controller;
      let assembled = "";

      try {
        const origin = requireApiOrigin();
        const history = getStoreSnapshot()
          .conversations.find((item) => item.id === conversation.id)
          ?.messages.filter((message) => message.id !== assistant.id)
          .map((message) => ({ role: message.role, content: message.content })) ?? [
          { role: user.role, content: user.content },
        ];
        const accepted = await acceptChatJob(
          origin,
          buildChatRequest(conversation.id, history),
          controller.signal,
        );
        await consumeTokenStream(origin, accepted.id, accepted.token, controller.signal, (chunk) => {
          assembled += chunk;
          patchMessageContent(conversation.id, assistant.id, assembled, "defer");
        });
        patchMessageContent(conversation.id, assistant.id, assembled, "sync");
      } catch (error) {
        if (controller.signal.aborted) {
          patchMessageContent(conversation.id, assistant.id, assembled, "sync");
          return;
        }
        const detail =
          error instanceof ApiOriginMissingError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Inference request failed";
        setNotice(detail);
        if (assembled.length === 0) {
          patchMessageContent(
            conversation.id,
            assistant.id,
            `— stream did not complete: ${detail}`,
            "sync",
          );
        } else {
          patchMessageContent(conversation.id, assistant.id, assembled, "sync");
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setStream(null);
      }
    },
    [conversation],
  );

  if (id === undefined || conversation === undefined) {
    return (
      <Folio>
        <Mast kicker="missing sheet" title="This id is not on the device" />
        <HairlineRule />
        <p className="aa-lede">
          The identifier is not in local storage. Return to the drawing log and open a sheet from
          this browser.
        </p>
        <p>
          <Link to={ROUTES.history}>Back to index</Link>
        </p>
      </Folio>
    );
  }

  return (
    <Folio>
      <Mast
        kicker={conversation.id.slice(0, 10)}
        title={conversation.title}
        trailing={
          <button type="button" className="aa-press aa-lift" onClick={() => navigate(ROUTES.history)}>
            Index
          </button>
        }
      />
      <HairlineRule label="Manuscript" />
      {notice ? (
        <p className="aa-notice" role="status">
          {notice}
        </p>
      ) : null}
      <div ref={logRef} className="aa-manuscript" data-ecs="entity" data-role="manuscript" data-layout="manuscript">
        {conversation.messages.length === 0 ? (
          <p className="aa-empty">The sheet is blank. Compose below — the first line titles the log.</p>
        ) : (
          conversation.messages.map((message) => {
            const live = streaming && stream.messageId === message.id;
            return (
              <article key={message.id} className="aa-mark" data-role={message.role}>
                <header className="aa-mark__meta">
                  <span className="aa-mark__role">{roleMark(message.role)}</span>
                  <time dateTime={message.timestamp}>{formatClock(message.timestamp)}</time>
                  {message.role === "assistant" ? (
                    <span className="aa-mark__model">{message.model}</span>
                  ) : null}
                </header>
                <pre className="aa-mark__body">
                  {message.content}
                  {live ? <span className="aa-caret" aria-hidden="true" /> : null}
                </pre>
              </article>
            );
          })
        )}
      </div>
      <Composer disabled={false} streaming={streaming} onSubmit={(value) => void send(value)} onStop={stop} />
    </Folio>
  );
}
