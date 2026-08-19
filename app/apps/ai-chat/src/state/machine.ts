import type { AppConfig, Conversation, Message, StorageSnapshot, ThemePreference } from "@asad-architect/types";

export interface StreamCursor {
  readonly conversationId: string;
  readonly messageId: string;
}

export interface ClientState {
  readonly conversations: readonly Conversation[];
  readonly config: AppConfig;
  readonly stream: StreamCursor | null;
  readonly notice: string | null;
}

export type ClientAction =
  | { readonly type: "replace"; readonly snapshot: StorageSnapshot }
  | { readonly type: "upsert"; readonly conversation: Conversation }
  | { readonly type: "remove"; readonly id: string }
  | { readonly type: "append-message"; readonly conversationId: string; readonly message: Message }
  | {
      readonly type: "patch-message";
      readonly conversationId: string;
      readonly messageId: string;
      readonly content: string;
      readonly timestamp: string;
    }
  | { readonly type: "theme"; readonly theme: ThemePreference }
  | { readonly type: "stream"; readonly stream: StreamCursor | null }
  | { readonly type: "notice"; readonly notice: string | null };

export function emptyState(config: AppConfig): ClientState {
  return {
    conversations: [],
    config,
    stream: null,
    notice: null,
  };
}

export function toSnapshot(state: ClientState): StorageSnapshot {
  return {
    version: 1,
    conversations: state.conversations,
    config: state.config,
  };
}

function touchConversation(
  conversation: Conversation,
  messages: readonly Message[],
  timestamp: string,
): Conversation {
  return {
    ...conversation,
    messages,
    updatedAt: timestamp,
  };
}

function mapConversation(
  state: ClientState,
  id: string,
  mapper: (conversation: Conversation) => Conversation,
): ClientState {
  let changed = false;
  const conversations = state.conversations.map((conversation) => {
    if (conversation.id !== id) {
      return conversation;
    }
    changed = true;
    return mapper(conversation);
  });
  if (!changed) {
    return state;
  }
  return { ...state, conversations };
}

export function reduce(state: ClientState, action: ClientAction): ClientState {
  switch (action.type) {
    case "replace":
      return {
        ...state,
        conversations: action.snapshot.conversations,
        config: action.snapshot.config,
        stream: null,
        notice: null,
      };
    case "upsert": {
      const index = state.conversations.findIndex((item) => item.id === action.conversation.id);
      if (index < 0) {
        return { ...state, conversations: [action.conversation, ...state.conversations] };
      }
      const conversations = state.conversations.slice();
      conversations[index] = action.conversation;
      return { ...state, conversations };
    }
    case "remove":
      return {
        ...state,
        conversations: state.conversations.filter((item) => item.id !== action.id),
        stream: state.stream?.conversationId === action.id ? null : state.stream,
      };
    case "append-message":
      return mapConversation(state, action.conversationId, (conversation) =>
        touchConversation(conversation, [...conversation.messages, action.message], action.message.timestamp),
      );
    case "patch-message":
      return mapConversation(state, action.conversationId, (conversation) => {
        const messages = conversation.messages.map((message) =>
          message.id === action.messageId
            ? { ...message, content: action.content, timestamp: action.timestamp }
            : message,
        );
        return touchConversation(conversation, messages, action.timestamp);
      });
    case "theme":
      if (state.config.theme === action.theme) {
        return state;
      }
      return { ...state, config: { ...state.config, theme: action.theme } };
    case "stream":
      if (state.stream?.conversationId === action.stream?.conversationId && state.stream?.messageId === action.stream?.messageId) {
        return state;
      }
      return { ...state, stream: action.stream };
    case "notice":
      if (state.notice === action.notice) {
        return state;
      }
      return { ...state, notice: action.notice };
    default: {
      const _never: never = action;
      return _never;
    }
  }
}
