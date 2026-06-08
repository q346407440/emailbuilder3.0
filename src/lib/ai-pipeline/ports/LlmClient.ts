export type LlmMessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string | LlmMessageContentPart[];
};

export type LlmResponseFormat = {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
};

/** LLM 调用端口（MVP：豆包；单测：mock）。 */
export type LlmClient = {
  complete(messages: LlmMessage[], responseFormat?: LlmResponseFormat): Promise<string>;
};
