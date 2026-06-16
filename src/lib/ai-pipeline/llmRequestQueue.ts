import { AI_PIPELINE_LLM_MAX_CONCURRENCY } from "../../layout-variant-ai-contract/constants";
import type { LlmClient, LlmMessage, LlmResponseFormat } from "./ports/LlmClient";
import { getLlmExchangeContext, llmExchangeContextStore } from "./llmCallContext";

type QueueJob<T> = {
  priority: number;
  seq: number;
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

/** 有限并发 + 重试优先的 LLM 请求队列。 */
export class LlmRequestQueue {
  private active = 0;
  private pending: QueueJob<unknown>[] = [];
  private seq = 0;

  constructor(private readonly maxConcurrency: number) {}

  enqueue<T>(run: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        priority,
        seq: this.seq++,
        run: run as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.sortPending();
      this.pump();
    });
  }

  private sortPending(): void {
    this.pending.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.seq - b.seq;
    });
  }

  private pump(): void {
    while (this.active < this.maxConcurrency && this.pending.length > 0) {
      const job = this.pending.shift()!;
      this.active += 1;
      void job
        .run()
        .then(job.resolve, job.reject)
        .finally(() => {
          this.active -= 1;
          this.pump();
        });
    }
  }
}

let globalQueue: LlmRequestQueue | null = null;

export function getGlobalLlmRequestQueue(): LlmRequestQueue {
  if (!globalQueue) {
    globalQueue = new LlmRequestQueue(AI_PIPELINE_LLM_MAX_CONCURRENCY);
  }
  return globalQueue;
}

/** 测试或隔离场景下重置全局队列。 */
export function resetGlobalLlmRequestQueueForTests(): void {
  globalQueue = null;
}

export function wrapLlmClientWithQueue(
  client: LlmClient,
  queue: LlmRequestQueue = getGlobalLlmRequestQueue()
): LlmClient {
  return {
    async complete(messages: LlmMessage[], responseFormat?: LlmResponseFormat): Promise<string> {
      const ctx = { ...getLlmExchangeContext() };
      const isRetry = (ctx.attempt ?? 1) > 1;
      return queue.enqueue(
        () => llmExchangeContextStore.run(ctx, () => client.complete(messages, responseFormat)),
        isRetry ? 1 : 0
      );
    },
  };
}
