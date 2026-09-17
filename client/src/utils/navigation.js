/** Full-page navigation (Stripe Checkout, billing portal). Wrapped so it can be stubbed in tests. */
export function redirectTo(url) {
  window.location.assign(url);
}

/** Only allows same-site relative redirects, so `?redirect=` cannot become an open redirect. */
export function safeRedirectPath(value, fallback = '/feed') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
    return fallback;
  return value;
}
