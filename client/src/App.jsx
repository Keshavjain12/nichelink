import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Toaster } from 'sonner';
import { PageLoader } from './components/common/Feedback';
import { bootstrapSession } from './features/auth/sessionThunks';
import { useApplyTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const dispatch = useDispatch();
  const isDark = useApplyTheme();
  const { isResolving } = useAuth();

  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  return (
    <>
      {/*
       * Routes wait for the refresh cookie to be exchanged. Rendering them earlier lets page
       * queries fire without the access token, and RTK Query caches that guest response for the
       * rest of the visit — a signed-in member would keep seeing "Sign in to join".
       */}
      {isResolving ? <PageLoader /> : <AppRoutes />}
      <Toaster
        theme={isDark ? 'dark' : 'light'}
        position="top-right"
        richColors
        closeButton
        visibleToasts={3}
      />
    </>
  );
}
