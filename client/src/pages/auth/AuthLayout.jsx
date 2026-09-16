import { MessagesSquare, Users, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/common/Misc';

const HIGHLIGHTS = [
  { icon: Users, text: 'Focused communities for your exact role and stack' },
  { icon: MessagesSquare, text: 'Real-time conversations with peers worldwide' },
  { icon: Briefcase, text: 'Find collaborators for side projects and startups' },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1fr_1.1fr]">
      <main id="main-content" className="flex flex-col px-4 py-8 sm:px-10">
        <Link to="/" className="self-start rounded-lg" aria-label="NicheLink home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-fg-muted">{footer}</div>}
        </div>
      </main>
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-violet-700 to-fuchsia-700 lg:block" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">NicheLink</p>
          <h2 className="mt-4 max-w-md text-4xl font-bold leading-tight tracking-tight">
            Find your people. Build your niche.
          </h2>
          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-center gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <item.icon className="size-5" />
                </span>
                <span className="text-base text-white/90">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
