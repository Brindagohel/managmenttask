import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';

const EVENTS = [
  ['A task is assigned or reassigned', 'The employee gets the task details and deadline'],
  ['A deadline is changed', 'Including when you drag a task to a new day on the Planner'],
  ['An employee sends work for review', 'Every admin is notified'],
  ['A task is approved or sent back', 'The employee sees your feedback'],
  ['A repeating task is created again', 'The employee is told the next round is scheduled'],
  ['Reminders: due tomorrow, due today, overdue', 'Sent once a day per task'],
];

export default function EmailSettings() {
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null); // { ok, text }
  const [busy, setBusy] = useState('');

  useEffect(() => { api('/mail/status').then(setStatus).catch((e) => setResult({ ok: false, text: e.message })); }, []);

  const run = async (key, path, format) => {
    setBusy(key); setResult(null);
    try { const r = await api(path, { method: 'POST' }); setResult({ ok: true, text: format(r) }); }
    catch (e) { setResult({ ok: false, text: e.message }); }
    setBusy('');
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold md:text-4xl">Email &amp; alerts</h2>
        <p className="mt-1 text-mute">Employees are emailed automatically about their tasks.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal">
          <h3 className="mb-4 flex items-center gap-3 font-display text-xl font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-petal text-berry"><Icon name="mail" size={18} /></span> Status
          </h3>
          {!status && <p className="text-mute">Checking…</p>}
          {status && (
            <>
              <p className={`mb-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${status.configured ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {status.configured ? '● Email is ready' : '● Email is not set up yet'}
              </p>
              {status.configured && <p className="mt-2 text-sm text-mute">Sending from <b>{status.sender}</b>. Links in emails open <b>{status.appUrl}</b>.</p>}
              <p className="mt-1 text-sm text-mute">Daily reminders: {status.autoReminders ? 'automatic' : 'off locally (use the button below, or set REMINDERS_AUTO=true)'}.</p>

              {!status.configured && (
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
                  <li>Open your Google account → <b>Security</b> and turn on <b>2-Step Verification</b>.</li>
                  <li>Go to <b>myaccount.google.com/apppasswords</b> and create an App Password named TaskFlow.</li>
                  <li>In <code className="rounded bg-petal px-1">server/.env</code> add <code className="rounded bg-petal px-1">MAIL_USER=your@gmail.com</code> and <code className="rounded bg-petal px-1">MAIL_PASS=the 16 characters</code>.</li>
                  <li>Restart the server, then come back and press <b>Send test email</b>.</li>
                </ol>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button className="btn" disabled={!!busy} onClick={() => run('test', '/mail/test', (r) => r.message)}><Icon name="send" size={16} /> {busy === 'test' ? 'Sending…' : 'Send test email'}</button>
                <button className="btn btn-soft" disabled={!!busy} onClick={() => run('rem', '/mail/reminders', (r) => `Reminders sent: ${r.sent}. Already reminded today: ${r.skipped}. Failed: ${r.failed}.`)}>
                  <Icon name="bell" size={16} /> {busy === 'rem' ? 'Working…' : 'Send reminders now'}
                </button>
              </div>
              {result && <p className={`mt-4 rounded-xl p-3 text-sm ${result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{result.text}</p>}
            </>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal">
          <h3 className="mb-4 font-display text-xl font-bold">When emails are sent</h3>
          <ul className="space-y-3">
            {EVENTS.map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 text-berry"><Icon name="check" size={18} /></span>
                <span><b className="block">{t}</b><span className="text-sm text-mute">{d}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}