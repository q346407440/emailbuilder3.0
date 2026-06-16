import { describe, it } from "node:test";
import assert from "node:assert/strict";
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

  it("wrapLlmClientWithQueue 透传调用上下文（attempt > 1 提升优先级）", async () => {
    const queue = new LlmRequestQueue(1);
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const client: LlmClient = {
      async complete(messages) {
        const text = messages[0]?.content;
        if (text === "first") await firstGate;
        order.push(String(text));
        return "{}";
      },
    };
    const wrapped = wrapLlmClientWithQueue(client, queue);

    const first = wrapped.complete([{ role: "user", content: "first" }]);
    await delay(10);
    const normal = wrapped.complete([{ role: "user", content: "normal" }]);
    const retry = llmExchangeContextStore.run({ attempt: 2 }, () =>
      wrapped.complete([{ role: "user", content: "retry" }])
    );
    await delay(10);
    releaseFirst();
    await Promise.all([first, normal, retry]);

    assert.deepEqual(order, ["first", "retry", "normal"]);
  });
});
