import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PipelineStepProgress } from "./ports/PipelineProgressReporter";
import { llmExchangeContextStore } from "./llmCallContext";
import { LlmRequestQueue, wrapLlmClientWithQueue } from "./llmRequestQueue";
import type { LlmClient } from "./ports/LlmClient";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("LlmRequestQueue", () => {
  it("最多同时运行 maxConcurrency 个任务", async () => {
    const queue = new LlmRequestQueue(5);
    let active = 0;
    let maxActive = 0;

    const task = () =>
      queue.enqueue(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await delay(30);
        active -= 1;
        return active;
      });

    await Promise.all(Array.from({ length: 10 }, () => task()));
    assert.equal(maxActive, 5);
  });

  it("重试任务优先于新任务入队", async () => {
    const queue = new LlmRequestQueue(1);
    const order: string[] = [];

    const gate = { open: false };
    const waitGate = async () => {
      while (!gate.open) await delay(5);
    };

    const first = queue.enqueue(async () => {
      order.push("first-start");
      await waitGate();
      order.push("first-end");
    });

    await delay(10);
    const normal = queue.enqueue(async () => {
      order.push("normal");
    });
    const retry = queue.enqueue(async () => {
      order.push("retry");
    }, 1);

    await delay(10);
    gate.open = true;
    await Promise.all([first, normal, retry]);

    assert.deepEqual(order, ["first-start", "first-end", "retry", "normal"]);
  });

  it("排队任务在出队前不触发 step.start", async () => {
    const queue = new LlmRequestQueue(1);
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const startCount = { n: 0 };
    const step: PipelineStepProgress = {
      start: () => {
        startCount.n += 1;
      },
      failAttempt: () => {},
      retry: () => {},
      logDetail: () => {},
      succeed: () => {},
      fail: () => {},
    };

    const client: LlmClient = {
      async complete() {
        await firstGate;
        return "{}";
      },
    };
    const wrapped = wrapLlmClientWithQueue(client, queue);

    const first = llmExchangeContextStore.run({ stepProgress: step, attempt: 1 }, () =>
      wrapped.complete([{ role: "user", content: "first" }])
    );
    await delay(15);
    assert.equal(startCount.n, 1);

    const second = llmExchangeContextStore.run({ stepProgress: step, attempt: 1 }, () =>
      wrapped.complete([{ role: "user", content: "second" }])
    );
    await delay(15);
    assert.equal(startCount.n, 1, "第二个任务仍在排队时不应 start");

    releaseFirst();
    await Promise.all([first, second]);
    assert.equal(startCount.n, 2);
  });
});
