import { createSlice } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants/app';
import { readStorage } from '../../utils/misc';

const storedTheme = readStorage(STORAGE_KEYS.THEME);

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    /** 'light' | 'dark' | 'system' */
    theme: storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system',
    mobileNavOpen: false,
  },
  reducers: {
    themeChanged(state, { payload }) {
      state.theme = payload;
    },
    mobileNavToggled(state, { payload }) {
      state.mobileNavOpen = typeof payload === 'boolean' ? payload : !state.mobileNavOpen;
    },
  },
});

export const { themeChanged, mobileNavToggled } = uiSlice.actions;
export default uiSlice.reducer;

export const selectTheme = (state) => state.ui.theme;
export const selectMobileNavOpen = (state) => state.ui.mobileNavOpen;
