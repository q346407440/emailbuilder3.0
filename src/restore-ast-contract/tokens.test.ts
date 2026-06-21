import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOKEN_PRESET_SCALE_ORDER } from "../token-preset-contract";
import { ROLE_TOKENS, TONE_TOKENS, SPACE_TOKENS, RADIUS_TOKENS } from "./tokens";
import type { RadiusToken, RoleToken, SpaceToken, ToneToken } from "./types";

/**
 * 守卫「AST 字面量类型 ⟷ 期望值 ⟷ token-preset-contract」三方同源。
 * - 编译期：MutualExtends 断言字面量类型 == 期望集合（双向子集）。
 * - 运行期：deepEqual 断言期望集合 == token 契约 scale。
 * 任一侧漂移（如 token 契约新增字号档）→ 编译或测试失败，强制同步 types.ts。
 */

type MutualExtends<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

const EXPECTED_ROLES = ["display", "h1", "body", "caption"] as const;
const EXPECTED_TONES = ["primary", "accent", "secondary", "surface"] as const;
const EXPECTED_SPACES = ["section", "gap", "pageInline"] as const;
const EXPECTED_RADII = ["panel", "cta"] as const;

// 编译期：字面量类型必须与期望集合完全相等
const _roleSync: MutualExtends<RoleToken, (typeof EXPECTED_ROLES)[number]> = true;
const _toneSync: MutualExtends<ToneToken, (typeof EXPECTED_TONES)[number]> = true;
const _spaceSync: MutualExtends<SpaceToken, (typeof EXPECTED_SPACES)[number]> = true;
const _radiusSync: MutualExtends<RadiusToken, (typeof EXPECTED_RADII)[number]> = true;
void _roleSync;
void _toneSync;
void _spaceSync;
void _radiusSync;

describe("restore-ast 令牌与 token-preset-contract 同源", () => {
  it("typography 档位一致", () => {
    assert.deepEqual([...ROLE_TOKENS], [...EXPECTED_ROLES]);
    assert.deepEqual([...TOKEN_PRESET_SCALE_ORDER.typography], [...EXPECTED_ROLES]);
  });

  it("colors 档位一致", () => {
    assert.deepEqual([...TONE_TOKENS], [...EXPECTED_TONES]);
    assert.deepEqual([...TOKEN_PRESET_SCALE_ORDER.colors], [...EXPECTED_TONES]);
  });

  it("spacing 档位一致", () => {
    assert.deepEqual([...SPACE_TOKENS], [...EXPECTED_SPACES]);
    assert.deepEqual([...TOKEN_PRESET_SCALE_ORDER.spacing], [...EXPECTED_SPACES]);
  });

  it("radius 档位一致", () => {
    assert.deepEqual([...RADIUS_TOKENS], [...EXPECTED_RADII]);
    assert.deepEqual([...TOKEN_PRESET_SCALE_ORDER.radius], [...EXPECTED_RADII]);
  });
});
