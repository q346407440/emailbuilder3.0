/** 测试发信 / 导出时解析主题：优先 meta 发信信息，空则用【测试】+ 展示名。 */
export function resolveTestEmailSubject(args: {
  subject: string;
  displayName: string;
  emailKey: string;
}): string {
  const trimmed = args.subject.trim();
  if (trimmed) return trimmed;
  const name = args.displayName.trim() || args.emailKey.trim();
  return name ? `【测试】${name}` : "【测试】";
}
