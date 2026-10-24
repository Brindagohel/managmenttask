const COLORS = ['bg-rose text-berry-dark', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700'];

export default function Avatar({ name = '?', size = 'h-8 w-8' }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const color = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  return <span className={`inline-flex ${size} shrink-0 items-center justify-center rounded-full text-xs font-bold ${color}`}>{initials}</span>;
}
