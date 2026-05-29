import nodemailer, { type Transporter } from "nodemailer";

export type SmtpTestMailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

export type SmtpPublicStatus = {
  configured: boolean;
  fromEmail?: string;
  fromName?: string;
  host?: string;
  port?: number;
};

let cachedTransporter: Transporter | null = null;
let cachedConfigKey: string | null = null;

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return fallback;
}

/** SMTP 测试发信配置真源：环境变量（见仓库根目录 `.env.example`）。 */
export function readSmtpTestMailConfig(): SmtpTestMailConfig | null {
  const host = (process.env.EMAIL_SMTP_HOST ?? "").trim();
  const user = (process.env.EMAIL_SMTP_USER ?? "").trim();
  const pass = process.env.EMAIL_SMTP_PASS ?? "";
  const fromEmail = (process.env.EMAIL_SMTP_FROM ?? process.env.EMAIL_SMTP_USER ?? "").trim();
  if (!host || !user || !pass || !fromEmail) return null;

  const portRaw = (process.env.EMAIL_SMTP_PORT ?? "465").trim();
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port < 1) return null;

  const secure = parseBool(process.env.EMAIL_SMTP_SECURE, port === 465);
  const fromName = (process.env.EMAIL_SMTP_FROM_NAME ?? "Easy-Email 测试").trim() || "Easy-Email 测试";

  return { host, port, secure, user, pass, fromEmail, fromName };
}

export function getSmtpPublicStatus(): SmtpPublicStatus {
  const cfg = readSmtpTestMailConfig();
  if (!cfg) return { configured: false };
  return {
    configured: true,
    fromEmail: cfg.fromEmail,
    fromName: cfg.fromName,
    host: cfg.host,
    port: cfg.port,
  };
}

function configCacheKey(cfg: SmtpTestMailConfig): string {
  return `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}:${cfg.fromEmail}`;
}

function getTransporter(cfg: SmtpTestMailConfig): Transporter {
  const key = configCacheKey(cfg);
  if (cachedTransporter && cachedConfigKey === key) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export async function sendSmtpTestMail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId?: string }> {
  const cfg = readSmtpTestMailConfig();
  if (!cfg) {
    throw new Error(
      "SMTP 未配置：请在项目根目录创建 .env 并填写 EMAIL_SMTP_*（参考 .env.example）后重启 API 服务。"
    );
  }
  const to = params.to.trim();
  if (!isValidEmailAddress(to)) {
    throw new Error("收件人邮箱格式不正确");
  }
  const subject = params.subject.trim() || "Easy-Email 测试邮件";
  const html = params.html.trim();
  if (!html) throw new Error("邮件 HTML 为空");

  const transporter = getTransporter(cfg);
  const info = await transporter.sendMail({
    from: { name: cfg.fromName, address: cfg.fromEmail },
    to,
    subject,
    html,
  });
  return { messageId: typeof info.messageId === "string" ? info.messageId : undefined };
}
