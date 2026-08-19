import { randomBytes, randomUUID } from "node:crypto";
import type { ChatCompletionRequest, ChatMessageInput } from "@asad-architect/types";

export interface ChatJob {
  readonly id: string;
  readonly accessor: string;
  readonly messages: readonly ChatMessageInput[];
  readonly model: string | undefined;
  readonly createdAt: number;
}

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export class ChatJobStore {
  private readonly jobs = new Map<string, ChatJob>();

  constructor(private readonly ttlMs = DEFAULT_TTL_MS) {}

  create(request: ChatCompletionRequest): ChatJob {
    const id = request.conversationId?.trim() || randomUUID();
    const job: ChatJob = {
      id,
      accessor: randomBytes(24).toString("base64url"),
      messages: request.messages,
      model: request.model,
      createdAt: Date.now(),
    };
    this.jobs.set(id, job);
    return job;
  }

  getAuthorized(id: string, token: string): ChatJob | undefined {
    const job = this.jobs.get(id);
    if (!job || job.accessor !== token) {
      return undefined;
    }
    return job;
  }

  sweep(now = Date.now()): void {
    for (const [id, job] of this.jobs) {
      if (now - job.createdAt > this.ttlMs) {
        this.jobs.delete(id);
      }
    }
  }
}
