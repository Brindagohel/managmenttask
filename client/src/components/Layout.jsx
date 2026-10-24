import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import Icon, { Logo } from './Icon.jsx';
import Avatar from './Avatar.jsx';

// Small popup used the first time you switch to a role you haven't logged into yet
function AddAccountModal({ role, onClose }) {
  const { login, register } = useAuth();
  const [signup, setSignup] = useState(false);
  const [form, setForm] = useState({ name: '', email: role === 'admin' ? 'boss@example.com' : '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (signup) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-bold">{signup ? 'Create employee account' : `Log in as ${role === 'admin' ? 'admin' : 'employee'}`}</h2>
        <p className="text-sm text-mute">You only do this once. After that, one click switches views.</p>
        {signup && <input className="input" placeholder="Full name" value={form.name} onChange={set('name')} required />}
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in'}</button>
        </div>
        {role === 'employee' && (
          <button type="button" className="w-full text-sm font-medium text-berry-dark hover:underline" onClick={() => setSignup(!signup)}>
            {signup ? 'Already have an account? Log in' : 'No employee account yet? Sign up'}
          </button>
        )}
      </form>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, sessions, logout, switchRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [modalRole, setModalRole] = useState(null);

  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium transition ${isActive ? 'bg-petal text-berry-dark' : 'text-mute hover:bg-blush hover:text-ink'}`;

  const pick = async (role) => {
    if (role === user.role) return;
    if (sessions[role]) await switchRole(role);
    else setModalRole(role);
  };

  return (
    <div className="min-h-screen md:flex">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-petal bg-white/90 p-3 backdrop-blur md:hidden">
        <span className="flex items-center gap-2 font-display text-xl font-bold text-ink"><Logo size={32} /> TaskFlow</span>
        <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Icon name={open ? 'close' : 'menu'} size={22} /></button>
      </header>

      <aside className={`${open ? 'flex' : 'hidden'} w-full flex-col border-r border-petal bg-white p-5 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0`}>
        <div className="mb-8 hidden items-center gap-3 md:flex">
          <Logo />
          <span className="font-display text-2xl font-bold">TaskFlow</span>
        </div>
        <nav className="space-y-1" onClick={() => setOpen(false)}>
          <NavLink to="/" end className={link}><Icon name="tasks" /> {user.role === 'admin' ? 'All tasks' : 'My tasks'}</NavLink>
          {user.role === 'admin' && <NavLink to="/ai" className={link}><Icon name="sparkle" /> AI task generator</NavLink>}
        </nav>

        <div className="mt-8 space-y-3 md:mt-auto">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-blush p-1 text-sm font-semibold" title="Log in once per role, then switch instantly">
            {['admin', 'employee'].map((r) => (
              <button
                key={r}
                onClick={() => pick(r)}
                className={`rounded-xl px-3 py-2 transition ${user.role === r ? 'bg-white text-berry-dark shadow-sm' : 'text-mute hover:text-ink'}`}
              >
                {r === 'admin' ? 'Admin' : 'Employee'}{!sessions[r] && ' +'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-blush p-3">
            <Avatar name={user.name} size="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{user.name}</p>
              <p className="text-sm capitalize text-mute">{user.role}</p>
            </div>
            <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out"><Icon name="logout" /></button>
          </div>
        </div>
      </aside>

      {/* key = user id, so the page reloads fresh data when you switch role */}
      <main key={user.id} className="min-w-0 flex-1 p-4 md:p-10">{children}</main>

      {modalRole && <AddAccountModal role={modalRole} onClose={() => setModalRole(null)} />}
    </div>
  );
}