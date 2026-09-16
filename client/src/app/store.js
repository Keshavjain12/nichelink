import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import realtimeReducer from '../features/realtime/realtimeSlice';
import uiReducer from '../features/ui/uiSlice';
import { api } from './api';

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  realtime: realtimeReducer,
  [api.reducerPath]: api.reducer,
});

export function createStore(preloadedState) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  });
}

export const store = createStore();
