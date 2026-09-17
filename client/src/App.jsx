import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Toaster } from 'sonner';
import { bootstrapSession } from './features/auth/sessionThunks';
import { useApplyTheme } from './hooks/useTheme';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const dispatch = useDispatch();
  const isDark = useApplyTheme();

  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  return (
    <>
      <AppRoutes />
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
