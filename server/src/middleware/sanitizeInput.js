const MAX_DEPTH = 10;

function stripOperatorKeys(value, depth = 0) {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => stripOperatorKeys(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith('$') && !key.includes('.') && key !== '__proto__')
      .map(([key, nested]) => [key, stripOperatorKeys(nested, depth + 1)]),
  );
}

/**
 * Defence in depth against NoSQL operator injection: removes `$`-prefixed and dotted keys
 * from JSON bodies before validation runs.
 */
export function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req.body = stripOperatorKeys(req.body);
  }
  next();
}
