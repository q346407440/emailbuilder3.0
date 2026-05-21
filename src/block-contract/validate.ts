import type { EmailBlock, EmailTemplate } from "../types/email";
import { resolveBlockContract } from "./registry";
import type { BlockTypeContract } from "./types";

export type BlockContractIssue = { path: string; reason: string };

const THEME_REF_KEY = "$themeRef";

function isPathAllowed(path: string, allowedPrefixes: readonly string[]): boolean {
  return allowedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}.`)
  );
}

function collectUnknownPaths(
  value: unknown,
  basePath: string,
  allowedPrefixes: readonly string[],
  issues: BlockContractIssue[],
  blockId: string
): void {
  if (value === null || value === undefined) return;
  if (typeof value !== "object" || Array.isArray(value)) return;

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key === THEME_REF_KEY) continue;
    const path = basePath ? `${basePath}.${key}` : key;
    if (!isPathAllowed(path, allowedPrefixes)) {
      issues.push({
        path: `blocks.${blockId}.${path}`,
        reason: `字段不在 blockType 白名单内：${path}`,
      });
    }
    collectUnknownPaths((value as Record<string, unknown>)[key], path, allowedPrefixes, issues, blockId);
  }
}

function validateBindingsAgainstContract(
  block: EmailBlock,
  contract: BlockTypeContract,
  issues: BlockContractIssue[]
): void {
  if (!block.bindings) return;
  for (const bindPath of Object.keys(block.bindings)) {
    if (!isPathAllowed(bindPath, contract.allowedPrefixes)) {
      issues.push({
        path: `blocks.${block.id}.bindings.${bindPath}`,
        reason: `bindings 路径不在 blockType（${contract.blockType}）白名单内：${bindPath}`,
      });
    }
  }
}

function validateBlockShell(block: EmailBlock, contract: BlockTypeContract, issues: BlockContractIssue[]): void {
  for (const key of Object.keys(block)) {
    if (!(contract.shellKeys as readonly string[]).includes(key)) {
      issues.push({
        path: `blocks.${block.id}.${key}`,
        reason: `block 壳层不允许的键：${key}（blockType ${contract.blockType}）`,
      });
    }
  }
}

/**
 * 按 `src/block-contract` 白名单校验 template 内各 block 的字段闭包。
 */
export function validateTemplateBlockContracts(t: EmailTemplate): BlockContractIssue[] {
  const issues: BlockContractIssue[] = [];

  for (const block of Object.values(t.blocks)) {
    const contract = resolveBlockContract(block, t);
    if (!contract) {
      issues.push({
        path: `blocks.${block.id}.type`,
        reason: `未知 runtime type，无 blockType 白名单：${block.type}`,
      });
      continue;
    }

    if (contract.runtimeType !== block.type) {
      issues.push({
        path: `blocks.${block.id}.type`,
        reason: `blockType ${contract.blockType} 与 runtime type ${block.type} 不一致`,
      });
    }

    validateBlockShell(block, contract, issues);
    collectUnknownPaths(block.wrapperStyle, "wrapperStyle", contract.allowedPrefixes, issues, block.id);
    collectUnknownPaths(block.props, "props", contract.allowedPrefixes, issues, block.id);
    validateBindingsAgainstContract(block, contract, issues);
  }

  return issues;
}
