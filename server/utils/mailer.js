import nodemailer from 'nodemailer';

// Gmail sender. Needs MAIL_USER (your Gmail address) and MAIL_PASS (a 16-character Google App Password).
export const mailReady = () => !!(process.env.MAIL_USER && process.env.MAIL_PASS);

let transporter;
function transport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.MAIL_USER, pass: String(process.env.MAIL_PASS).replace(/\s/g, '') },
    });
  }
  return transporter;
}

// Never throws: a failed email must not break saving a task.
export async function sendMail({ to, subject, html }) {
  if (!mailReady()) {
    console.log(`[mail] skipped (MAIL_USER / MAIL_PASS not set): ${subject}`);
    return { sent: false, reason: 'Email is not configured' };
  }
  if (!to) return { sent: false, reason: 'No recipient' };
  // demo accounts from seed.js have no real inbox
  if (/@demo\.taskflow$/i.test(to)) return { sent: false, demo: true, reason: 'Demo account (no real inbox)' };
  try {
    await Promise.race([
      transport().sendMail({
        from: `"${process.env.MAIL_FROM_NAME || 'TaskFlow'}" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Email timed out')), 10000)),
    ]);
    return { sent: true };
  } catch (e) {
    console.error('[mail] failed:', e.message);
    return { sent: false, reason: e.message };
  }
}

// ---------- HTML templates (same pink theme as the app) ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const appUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

const PRIORITY = { High: '#d6578a', Medium: '#f59e0b', Low: '#10b981' };

export function emailLayout({ heading, intro, task, extra = '', button = 'Open TaskFlow', accent = '#d6578a' }) {
  const card = task ? `
    <table role="presentation" width="100%" style="margin:18px 0;border:1px solid #ffe4ee;border-left:5px solid ${PRIORITY[task.priority] || accent};border-radius:12px;background:#fff7fa">
      <tr><td style="padding:16px 18px">
        <div style="font-size:18px;font-weight:700;color:#3b2230">${esc(task.title)}</div>
        ${task.description ? `<div style="margin-top:6px;color:#8f7683;font-size:14px;line-height:1.5">${esc(task.description)}</div>` : ''}
        <div style="margin-top:12px;font-size:13px;color:#3b2230">
          <b>Deadline:</b> ${fmtDate(task.deadline)} &nbsp;·&nbsp; <b>Priority:</b> <span style="color:${PRIORITY[task.priority] || accent};font-weight:700">${esc(task.priority)}</span>
        </div>
      </td></tr>
    </table>` : '';
  return `<!doctype html><html><body style="margin:0;background:#fff7fa;font-family:Segoe UI,Arial,sans-serif">
  <table role="presentation" width="100%" style="padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="560" style="max-width:560px;background:#ffffff;border-radius:18px;border:1px solid #ffe4ee;overflow:hidden">
      <tr><td style="background:${accent};padding:18px 24px;color:#fff;font-size:20px;font-weight:700">✓ TaskFlow</td></tr>
      <tr><td style="padding:24px">
        <div style="font-size:22px;font-weight:700;color:#3b2230">${esc(heading)}</div>
        <p style="color:#3b2230;font-size:15px;line-height:1.6;margin:10px 0 0">${intro}</p>
        ${card}${extra}
        <a href="${appUrl()}" style="display:inline-block;margin-top:8px;background:${accent};color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">${esc(button)}</a>
      </td></tr>
      <tr><td style="padding:14px 24px;background:#fff7fa;color:#8f7683;font-size:12px">You are receiving this because you use TaskFlow. Please do not reply to this email.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export { esc };