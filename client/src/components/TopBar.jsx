import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { bucket, dayOf, fmtDay } from '../utils.js';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function TopBar({ refreshKey }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';
  const [tasks, setTasks] = useState([]);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const input = useRef(null);
  const searchBox = useRef(null);
  const bellBox = useRef(null);

  const load = () => api('/tasks').then(setTasks).catch(() => {});
  useEffect(() => { load(); }, [refreshKey, user.id]);

  // Ctrl+K / Cmd+K focuses the search; the dashboard banner can also trigger it
  useEffect(() => {
    const focus = () => { input.current?.focus(); setSearchOpen(true); };
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); focus(); }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-search', focus);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-search', focus); };
  }, []);

  // close dropdowns when clicking elsewhere
  useEffect(() => {
    const onDown = (e) => {
      if (!searchBox.current?.contains(e.target)) setSearchOpen(false);
      if (!bellBox.current?.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const pages = [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: isAdmin ? 'All tasks' : 'My tasks', to: '/tasks', icon: 'tasks' },
    ...(isAdmin ? [{ label: 'AI task generator', to: '/ai', icon: 'sparkle' }] : []),
  ];
  const term = q.trim().toLowerCase();
  const results = useMemo(() => !term ? [] : tasks.filter((t) =>
    `${t.title} ${t.description || ''} ${t.assignedTo?.name || ''}`.toLowerCase().includes(term)).slice(0, 6), [tasks, term]);
  const pageHits = pages.filter((p) => !term || p.label.toLowerCase().includes(term));

  const go = (to) => { setSearchOpen(false); setBellOpen(false); setQ(''); input.current?.blur(); navigate(to); };
  const openTask = (t) => go(`/tasks?q=${encodeURIComponent(t.title)}`);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setSearchOpen(false); input.current?.blur(); }
    if (e.key === 'Enter' && term) go(`/tasks?q=${encodeURIComponent(q.trim())}`);
  };

  const listen = () => {
    if (!SR || listening) return;
    const r = new SR();
    r.lang = 'en-US';
    r.onresult = (e) => { setQ(e.results[0][0].transcript); setSearchOpen(true); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    setListening(true);
    r.start();
  };

  // notifications: overdue + due today + due tomorrow (not completed)
  const alerts = tasks.filter((t) => ['overdue', 'today', 'tomorrow'].includes(bucket(t))).sort((a, b) => dayOf(a).localeCompare(dayOf(b)));
  const urgent = alerts.filter((t) => ['overdue', 'today'].includes(bucket(t))).length;
  const LABEL = { overdue: 'Overdue', today: 'Due today', tomorrow: 'Due tomorrow' };
  const TONE = { overdue: 'text-red-500', today: 'text-berry-dark', tomorrow: 'text-mute' };

  return (
    <header className="flex items-center gap-3 border-b border-petal bg-white/80 px-4 py-3 backdrop-blur md:sticky md:top-0 md:z-10 md:px-10">
      <div ref={searchBox} className="relative max-w-xl flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute"><Icon name="search" size={16} /></span>
        <input
          ref={input}
          className="input !rounded-full !pl-10 !pr-24"
          placeholder="Search tasks, people, pages…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
          onFocus={() => { setSearchOpen(true); load(); }}
          onKeyDown={onKeyDown}
          aria-label="Search"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          <kbd className="hidden rounded-md bg-petal px-1.5 py-0.5 text-[11px] font-semibold text-berry-dark sm:block">Ctrl+K</kbd>
          {SR && (
            <button type="button" onClick={listen} className={`icon-btn !p-1 ${listening ? '!bg-petal !text-berry' : ''}`} aria-label="Voice search" title="Voice search">
              <Icon name="mic" size={16} />
            </button>
          )}
        </div>

        {searchOpen && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-petal bg-white p-2 shadow-2xl shadow-rose/30">
            {pageHits.length > 0 && <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-mute">Pages</p>}
            {pageHits.map((p) => (
              <button key={p.to} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-blush" onClick={() => go(p.to)}>
                <span className="text-berry"><Icon name={p.icon} size={16} /></span>{p.label}
              </button>
            ))}
            {term && <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-mute">Tasks</p>}
            {results.map((t) => (
              <button key={t._id} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-blush" onClick={() => openTask(t)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.title}</span>
                  <span className="block truncate text-xs text-mute">{t.status} · {t.priority}{t.assignedTo?.name ? ` · ${t.assignedTo.name}` : ''}</span>
                </span>
                <span className="shrink-0 text-xs text-mute">{fmtDay(dayOf(t))}</span>
              </button>
            ))}
            {term && !results.length && <p className="px-3 py-3 text-sm text-mute">No tasks match “{q}”.</p>}
            {term && <p className="px-3 pt-2 text-xs text-mute">Press Enter to see all matches in the task board.</p>}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <div ref={bellBox} className="relative">
          <button className="icon-btn relative" onClick={() => { setBellOpen(!bellOpen); load(); }} aria-label="Notifications" title="Notifications">
            <Icon name="bell" size={20} />
            {urgent > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-berry px-1 text-[10px] font-bold text-white">{urgent}</span>}
          </button>
          {bellOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[85vw] rounded-2xl border border-petal bg-white p-2 shadow-2xl shadow-rose/30">
              <p className="px-3 py-2 font-display font-bold">Notifications</p>
              {!alerts.length && <p className="px-3 pb-3 text-sm text-mute">You are all caught up 🎉</p>}
              <div className="max-h-80 overflow-y-auto">
                {alerts.map((t) => (
                  <button key={t._id} className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-blush" onClick={() => openTask(t)}>
                    <span className={`mt-0.5 ${TONE[bucket(t)]}`}><Icon name={bucket(t) === 'overdue' ? 'alert' : 'clock'} size={16} /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{t.title}</span>
                      <span className={`block text-xs font-semibold ${TONE[bucket(t)]}`}>{LABEL[bucket(t)]} · {fmtDay(dayOf(t))}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="ml-2 hidden items-center gap-2 sm:flex">
          <Avatar name={user.name} size="h-9 w-9" />
          <span className="font-semibold">{user.name.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  );
}
