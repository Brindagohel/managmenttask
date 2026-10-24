import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

// Floating quick-navigation bar (always visible at the bottom). Admins also get a quick "add task" button.
export default function BottomDock({ isAdmin, onAdd }) {
  const item = ({ isActive }) =>
    `flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-petal text-berry-dark' : 'text-mute hover:bg-blush hover:text-ink'}`;

  const Item = ({ to, icon, label, end }) => (
    <NavLink to={to} end={end} className={item} title={label}>
      {({ isActive }) => (<><Icon name={icon} size={20} />{isActive && <span>{label}</span>}</>)}
    </NavLink>
  );

  return (
    <nav className="fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-petal bg-white/95 p-1.5 shadow-xl shadow-rose/40 backdrop-blur">
      <Item to="/" end icon="dashboard" label="Dashboard" />
      <Item to="/tasks" icon="tasks" label={isAdmin ? 'All tasks' : 'My tasks'} />
      {isAdmin && <Item to="/ai" icon="sparkle" label="AI generator" />}
      {isAdmin && (
        <button className="btn ml-1 !h-11 !w-11 !rounded-full !p-0" onClick={onAdd} aria-label="Quick add task" title="Quick add task">
          <Icon name="plus" size={22} />
        </button>
      )}
    </nav>
  );
}