/** Normalizes RTK Query / fetch errors into a user-facing message. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error.status === 'FETCH_ERROR') return 'Unable to reach NicheLink. Check your connection and try again.';
  if (error.status === 'PARSING_ERROR') return 'The server returned an unexpected response.';
  return error.data?.message ?? error.message ?? fallback;
}

export function getErrorCode(error) {
  return error?.data?.code ?? error?.code ?? null;
}

export function getFieldErrors(error) {
  return error?.data?.errors ?? [];
}

/** Maps API field errors onto react-hook-form fields. Returns true when at least one was applied. */
export function applyFieldErrors(error, setError) {
  const fieldErrors = getFieldErrors(error).filter((item) => item.field);
  fieldErrors.forEach((item) => setError(item.field, { type: 'server', message: item.message }));
  return fieldErrors.length > 0;
}
