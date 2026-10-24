import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { Logo } from '../components/Icon.jsx';

const SAMPLES = [
  ['Design landing page', 'High', 'bg-berry', 'rotate-[-3deg]', 'ml-0'],
  ['Review pull requests', 'Medium', 'bg-amber-300', 'rotate-[2deg]', 'ml-10'],
  ['Send weekly report', 'Low', 'bg-emerald-300', 'rotate-[-1.5deg]', 'ml-4'],
];

export default function Login() {
  const { login, register } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (isSignup) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-petal p-12 lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-rose/50" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/60" />
        <div className="relative flex items-center gap-3"><Logo /><span className="font-display text-2xl font-bold">TaskFlow</span></div>
        <div className="relative">
          <h1 className="mb-10 max-w-md text-5xl font-bold leading-tight">Keep every task moving.</h1>
          <div className="max-w-sm space-y-3">
            {SAMPLES.map(([title, p, stripe, tilt, ml]) => (
              <div key={title} className={`relative overflow-hidden rounded-2xl bg-white p-4 pl-5 shadow-lg shadow-rose/40 ${tilt} ${ml}`}>
                <span className={`absolute inset-y-0 left-0 w-1.5 ${stripe}`} />
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-mute">{p} priority</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative max-w-sm text-mute">Assign work, track progress and keep deadlines visible for the whole team.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="mb-2 flex items-center gap-3 lg:hidden"><Logo /><span className="font-display text-2xl font-bold">TaskFlow</span></div>
          <h2 className="text-3xl font-bold">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="text-mute">{isSignup ? 'Sign up as an employee to receive tasks.' : 'Log in to see your tasks.'}</p>
          {isSignup && <input className="input" placeholder="Full name" value={form.name} onChange={set('name')} required />}
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
          <input className="input" type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={set('password')} required />
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}</button>
          <button type="button" className="w-full text-sm font-medium text-berry-dark hover:underline" onClick={() => { setIsSignup(!isSignup); setError(''); }}>
            {isSignup ? 'Already have an account? Log in' : 'New employee? Sign up'}
          </button>
        </form>
      </section>
    </div>
  );
}
