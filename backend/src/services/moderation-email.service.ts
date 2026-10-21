/** Avisos de moderação. Não incluem identidade do denunciante ou moderador. */
import pool from "../config/database.js";
import { env } from "../config/env.js";

let warnedConfiguration = false;
const SUPPORT_EMAIL = "congplatform@gmail.com";

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(
    /[&<>"']/g,
    (character) => replacements[character] ?? character,
  );
}

function moderationUrl(): string {
  return new URL("/app/moderacao", env.frontendUrl).toString();
}

const emailShell = (input: {
  title: string;
  eyebrow: string;
  accent: "blue" | "amber" | "red";
  intro: string;
  blocks?: { title: string; content: string }[];
  ctaText: string;
  ctaUrl: string;
}): string => {
  const accent =
    input.accent === "red"
      ? "#a92c48"
      : input.accent === "amber"
        ? "#995f16"
        : "#245baa";
  const accentBackground =
    input.accent === "red"
      ? "#fff1f2"
      : input.accent === "amber"
        ? "#fff8e9"
        : "#f0f5fe";
  const advisory =
    input.eyebrow === "Central de moderação"
      ? "Os detalhes ficam disponíveis somente na central de moderação, após autenticação."
      : "Esta é uma decisão de segurança da comunidade CONG. Evite repetir a conduta indicada.";
  const blocks = (input.blocks ?? [])
    .map(
      (block) =>
        `<section style="padding:15px 18px;margin-top:11px;border:1px solid #dfe8f3;border-radius:10px;background:#f8faff"><p style="margin:0 0 6px;font-size:11px;color:#516987;font-weight:800;letter-spacing:.07em;text-transform:uppercase">${escapeHtml(block.title)}</p><p style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55;color:#1b3655;font-size:14px">${escapeHtml(block.content)}</p></section>`,
    )
    .join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:30px 12px;background:#edf2f9;font-family:Arial,Helvetica,sans-serif;color:#172f4d"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:#fff;border:1px solid #dbe6f3;border-radius:16px;overflow:hidden"><tr><td style="padding:23px 28px;background:#f8fbff;border-bottom:1px solid #dde7f2"><span style="display:inline-block;background:#ffcf53;width:26px;height:5px;transform:rotate(-8deg);vertical-align:middle;margin-right:9px"></span><strong style="font-size:22px;letter-spacing:.13em;color:#173c63">CONG</strong><span style="display:block;margin-top:5px;color:#617793;font-size:11px">Construtor Operacional para ONGs</span></td></tr><tr><td style="padding:26px 28px"><span style="font-size:11px;font-weight:800;color:${accent};letter-spacing:.09em;text-transform:uppercase">${escapeHtml(input.eyebrow)}</span><h1 style="font-size:24px;line-height:1.25;margin:10px 0 16px;color:#18324f">${escapeHtml(input.title)}</h1><p style="font-size:14px;line-height:1.7;color:#435875;margin:0 0 18px">${escapeHtml(input.intro)}</p><div style="padding:10px 13px;border-left:3px solid ${accent};border-radius:0 7px 7px 0;background:${accentBackground};font-size:12px;color:#415a77">${escapeHtml(advisory)}</div>${blocks}<p style="margin:23px 0 6px"><a href="${escapeHtml(input.ctaUrl)}" style="background:${accent};display:inline-block;border-radius:9px;text-decoration:none;color:#fff;padding:12px 17px;font-size:13px;font-weight:700">${escapeHtml(input.ctaText)}</a></p><p style="margin:21px 0 0;color:#6c7d95;font-size:12px;line-height:1.6">Dúvidas sobre esta decisão? Entre em contato com <a href="mailto:${SUPPORT_EMAIL}" style="color:#245baa">${SUPPORT_EMAIL}</a>.</p></td></tr><tr><td style="padding:15px 28px;border-top:1px solid #e4ebf4;color:#8a98aa;font-size:11px;background:#fbfcff">Mensagem automática da CONG. Não responda diretamente a este e-mail.</td></tr></table></body></html>`;
};

async function sendModerationEmail(input: {
  recipient: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = process.env.MODERATION_EMAIL_FROM?.trim();
  if (!apiKey || !sender) {
    if (!warnedConfiguration) {
      console.warn(
        "E-mails de moderação desativados: configure RESEND_API_KEY e MODERATION_EMAIL_FROM no backend ativo.",
      );
      warnedConfiguration = true;
    }
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: sender,
      to: [input.recipient],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) throw new Error(`Resend retornou HTTP ${response.status}`);
  return true;
}

/** A denúncia envia somente um aviso de fila, nunca dados da pessoa denunciada. */
export async function emailNewCommunityReport(input: {
  reportId: string;
  reporterUserId: string;
  targetType: "post" | "comment" | "user";
}): Promise<void> {
  const recipients = await pool.query<{ userId: string; email: string }>(
    `select distinct u.id as "userId", au.email
       from public.users u join auth.users au on au.id = u.auth_user_id
       join public.roles r on r.id = u.platform_role_id
       left join public.role_permissions rp on rp.role_id = r.id
       left join public.permissions p on p.id = rp.permission_id
      where u.active = true and au.email is not null and au.email_confirmed_at is not null
        and (r.code in ('community_moderator','platform_admin') or p.code = 'community.moderate')`,
  );
  if (!recipients.rows.length) {
    console.warn(
      "Denúncia registrada sem destinatários de e-mail de moderação",
      { reportId: input.reportId },
    );
    return;
  }
  const target =
    input.targetType === "post"
      ? "publicação"
      : input.targetType === "comment"
        ? "comentário"
        : "perfil";
  let sent = 0,
    failed = 0,
    disabled = 0;
  for (let i = 0; i < recipients.rows.length; i += 4) {
    await Promise.all(
      recipients.rows.slice(i, i + 4).map(async (recipient) => {
        try {
          const accepted = await sendModerationEmail({
            recipient: recipient.email,
            subject: "Nova denúncia aguardando análise | CONG",
            text: `Uma denúncia de ${target} aguarda análise na central de moderação.\n${moderationUrl()}`,
            html: emailShell({
              eyebrow: "Central de moderação",
              title: "Nova denúncia para análise",
              accent: "amber",
              intro: `Uma denúncia de ${target} foi registrada. Acesse a central para consultar os detalhes com segurança.`,
              ctaText: "Analisar denúncia",
              ctaUrl: moderationUrl(),
            }),
            idempotencyKey: `cong-report-${input.reportId}-${recipient.userId}`,
          });
          if (accepted) sent++;
          else disabled++;
        } catch (error) {
          failed++;
          console.error("Falha no e-mail de denúncia", {
            reportId: input.reportId,
            recipientId: recipient.userId,
            error,
          });
        }
      }),
    );
  }
  console.info("E-mails de denúncia", {
    reportId: input.reportId,
    eligible: recipients.rows.length,
    acceptedByProvider: sent,
    notConfigured: disabled,
    failed,
  });
}

type DecisionAction =
  | "warn_user"
  | "suspend_24h"
  | "suspend_7d"
  | "ban_user"
  | "lift_restriction"
  | "hide_content"
  | "restore_content";
const actionContent: Record<
  DecisionAction,
  { title: string; intro: string; accent: "blue" | "amber" | "red" }
> = {
  warn_user: {
    title: "Você recebeu uma advertência",
    intro:
      "Identificamos uma conduta contrária às regras da comunidade. Esta advertência é um alerta para que o comportamento não se repita.",
    accent: "amber",
  },
  suspend_24h: {
    title: "Sua conta foi suspensa por 24 horas",
    intro:
      "O acesso à CONG está temporariamente suspenso em razão de uma infração às regras da comunidade.",
    accent: "red",
  },
  suspend_7d: {
    title: "Sua conta foi suspensa por 7 dias",
    intro:
      "O acesso à CONG está temporariamente suspenso em razão de uma infração às regras da comunidade.",
    accent: "red",
  },
  ban_user: {
    title: "Sua conta foi banida da CONG",
    intro:
      "Uma infração grave ou reincidência resultou no bloqueio da conta. Para solicitar esclarecimentos, contate a CONG pelo endereço indicado abaixo.",
    accent: "red",
  },
  lift_restriction: {
    title: "Sua restrição de acesso foi removida",
    intro: "A restrição anteriormente aplicada à sua conta foi revogada.",
    accent: "blue",
  },
  hide_content: {
    title: "Seu conteúdo foi removido da comunidade",
    intro:
      "Uma publicação ou comentário foi ocultado após análise da moderação.",
    accent: "amber",
  },
  restore_content: {
    title: "Seu conteúdo foi restaurado",
    intro: "Uma publicação ou comentário voltou a ficar visível na comunidade.",
    accent: "blue",
  },
};

async function readReportTarget(
  reportId: string,
): Promise<{ title: string; excerpt: string } | null> {
  const record = await pool.query<{
    postId: string | null;
    commentId: string | null;
    userId: string | null;
  }>(
    `select post_id as "postId", comment_id as "commentId", reported_user_id as "userId"
       from public.community_reports where id = $1`,
    [reportId],
  );
  const r = record.rows[0];
  if (!r) return null;
  if (r.postId) {
    const row = await pool.query<{ title: string; excerpt: string }>(
      `select title, left(coalesce(nullif(description,''),nullif(content,''),title), 440) as excerpt
         from public.community_posts where id = $1`,
      [r.postId],
    );
    return row.rows[0]
      ? {
          title: `Publicação: ${row.rows[0].title}`,
          excerpt: row.rows[0].excerpt,
        }
      : null;
  }
  if (r.commentId) {
    const row = await pool.query<{ content: string }>(
      `select left(content, 440) as content from public.community_post_comments where id = $1`,
      [r.commentId],
    );
    return row.rows[0]
      ? { title: "Comentário", excerpt: row.rows[0].content }
      : null;
  }
  if (r.userId) {
    const row = await pool.query<{
      displayName: string;
      username: string | null;
    }>(
      `select coalesce(display_name,name) as "displayName", username from public.users where id = $1`,
      [r.userId],
    );
    return row.rows[0]
      ? {
          title: "Perfil denunciado",
          excerpt: row.rows[0].username
            ? `@${row.rows[0].username}`
            : row.rows[0].displayName,
        }
      : null;
  }
  return null;
}

export async function emailModerationDecision(input: {
  reportId: string;
  recipientUserId: string;
  action: DecisionAction;
  reason?: string;
  guidance?: string;
  responseHours?: 24 | 168 | null;
}): Promise<void> {
  try {
    const recipient = await pool.query<{ email: string }>(
      `select au.email from public.users u join auth.users au on au.id = u.auth_user_id
       where u.id = $1 and au.email is not null and au.email_confirmed_at is not null limit 1`,
      [input.recipientUserId],
    );
    const email = recipient.rows[0]?.email;
    if (!email) return;
    const display = actionContent[input.action];
    const target = await readReportTarget(input.reportId);
    const blocks: { title: string; content: string }[] = [];
    if (target) blocks.push({ title: target.title, content: target.excerpt });
    if (input.reason?.trim())
      blocks.push({
        title: "Motivo da medida",
        content: input.reason.trim().slice(0, 1200),
      });
    if (input.action === "suspend_24h" || input.action === "suspend_7d") {
      const status = await pool.query<{ until: Date | null }>(
        `select suspended_until as until from public.community_user_sanctions where user_id = $1 and status = 'suspended'`,
        [input.recipientUserId],
      );
      if (status.rows[0]?.until)
        blocks.push({
          title: "Previsão de término",
          content:
            new Date(status.rows[0].until).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            }) + " (horário de Brasília)",
        });
    }
    if (input.guidance?.trim())
      blocks.push({
        title: "O que fazer agora",
        content: input.guidance.trim().slice(0, 600),
      });
    if (input.responseHours) {
      const deadline = new Date(
        Date.now() + input.responseHours * 60 * 60 * 1000,
      ).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      blocks.push({
        title: "Prazo para resposta",
        content: `${deadline} (horário de Brasília). Este prazo não gera banimento automático; o caso será reavaliado pela equipe.`,
      });
    }
    const contactLink = `mailto:${SUPPORT_EMAIL}`;
    const isRestricted = ["suspend_24h", "suspend_7d", "ban_user"].includes(
      input.action,
    );
    const url = isRestricted
      ? contactLink
      : new URL("/app", env.frontendUrl).toString();
    const linkLabel = isRestricted
      ? "Solicitar esclarecimentos"
      : "Acessar a CONG";
    const text = [
      display.title,
      display.intro,
      ...blocks.map((b) => `${b.title}: ${b.content}`),
      `${linkLabel}: ${url}`,
      `Suporte: ${SUPPORT_EMAIL}`,
    ].join("\n\n");
    const accepted = await sendModerationEmail({
      recipient: email,
      subject: `${display.title} | CONG`,
      text,
      html: emailShell({
        eyebrow: "Segurança da comunidade",
        title: display.title,
        intro: display.intro,
        accent: display.accent,
        blocks,
        ctaText: linkLabel,
        ctaUrl: url,
      }),
      idempotencyKey: `cong-action-${input.reportId}-${input.action}-${input.recipientUserId}`,
    });
    console.info("Aviso de moderação", {
      reportId: input.reportId,
      action: input.action,
      acceptedByProvider: accepted,
    });
  } catch (error) {
    console.error("Falha no e-mail de ação de moderação", {
      reportId: input.reportId,
      recipientId: input.recipientUserId,
      error,
    });
  }
}
