/** schema-registry 索引条目形态（版本号引用各 *-contract 常量，不在此双写） */

export type SchemaValidationIssue = {
  path: string;
  reason: string;
};

export type SchemaArtifactDef = {
  /** 机器 id，如 template / payload / meta */
  id: string;
  /** 人类可读名称 */
  label: string;
  /** 引用 *-contract 的 currentVersion 常量值 */
  currentVersion: string;
  /** 落盘路径说明（文档/枚举用） */
  diskPatterns: string[];
  /** 单文件 JSON 形态校验 */
  validate: (raw: unknown) => SchemaValidationIssue[];
  /** 可选：关联 migrate npm script（仅索引，逻辑在 scripts/） */
  migrateScripts?: { preview?: string; write?: string };
};

export type SchemaArtifactId = SchemaArtifactDef["id"];
