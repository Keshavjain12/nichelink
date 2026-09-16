import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { STORAGE_KEYS } from '../constants/app';
import { selectTheme, themeChanged } from '../features/ui/uiSlice';
import { useMediaQuery } from './common';
import { writeStorage } from '../utils/misc';

/** Applies the theme class to <html>; mount once near the root. */
export function useApplyTheme() {
  const theme = useSelector(selectTheme);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return isDark;
}

export function useTheme() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const setTheme = (next) => {
    dispatch(themeChanged(next));
    writeStorage(STORAGE_KEYS.THEME, next === 'system' ? null : next);
  };

  return { theme, setTheme, isDark: theme === 'dark' || (theme === 'system' && prefersDark) };
}
