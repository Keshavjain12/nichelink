import { Menu as MenuIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { Logo } from '../common/Misc';

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#communities', label: 'Communities' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="NicheLink home" className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-fg-muted transition-colors hover:text-fg">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <Button as={Link} to="/feed">
              Open app
            </Button>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost">
                Sign in
              </Button>
              <Button as={Link} to="/register">
                Join free
              </Button>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <MenuIcon className="size-5" aria-hidden="true" />}
        </Button>
      </div>
      {open && (
        <nav aria-label="Mobile main" className="animate-fade-in border-t border-line bg-surface px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-hover">
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button as={Link} to="/login" variant="secondary">
              Sign in
            </Button>
            <Button as={Link} to="/register">
              Join free
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-fg-muted">
            Persistent, high-quality micro-communities for remote professionals. Find your people. Build your niche.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg">Product</h2>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            <li><Link to="/communities" className="hover:text-fg">Communities</Link></li>
            <li><Link to="/pricing" className="hover:text-fg">Pricing</Link></li>
            <li><Link to="/register" className="hover:text-fg">Create an account</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg">Company</h2>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            <li><a href="#how-it-works" className="hover:text-fg">How it works</a></li>
            <li><a href="#features" className="hover:text-fg">Features</a></li>
            <li><span>Community guidelines</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-fg-subtle">
        © {new Date().getFullYear()} NicheLink. A portfolio project — demo data is fictional.
      </div>
    </footer>
  );
}
