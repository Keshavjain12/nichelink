import { Suspense, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useLocation } from 'react-router-dom';
import { useRealtimeBridge } from '../../features/realtime/useRealtimeBridge';
import { mobileNavToggled, selectMobileNavOpen } from '../../features/ui/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/misc';
import { InlineAlert, PageLoader } from '../common/Feedback';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell() {
  const dispatch = useDispatch();
  const { user, bootError } = useAuth();
  const mobileNavOpen = useSelector(selectMobileNavOpen);
  const location = useLocation();
  const isMessages = location.pathname.startsWith('/messages');

  useRealtimeBridge(user?.id);

  useEffect(() => {
    dispatch(mobileNavToggled(false));
    window.scrollTo({ top: 0 });
  }, [location.pathname, dispatch]);

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <TopBar />

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 sm:px-6">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto py-6 lg:block">
          <Sidebar />
        </aside>

        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1 focus:outline-none',
            isMessages ? 'py-0 sm:py-6' : 'py-6 pb-24 lg:pb-12',
          )}
        >
          {bootError && (
            <InlineAlert variant="warning" className="mb-4">
              {bootError}
            </InlineAlert>
          )}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <MobileNav />

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 animate-fade-in bg-slate-950/50"
            onClick={() => dispatch(mobileNavToggled(false))}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slide-up overflow-y-auto border-r border-line bg-surface px-4 py-5 shadow-elevated">
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}
