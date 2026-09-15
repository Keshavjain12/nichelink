import { ApiError } from '../utils/ApiError.js';

const LOCATIONS = ['params', 'query', 'body'];

/**
 * Validates and coerces request input with Zod schemas. Parsed values replace the raw
 * input so controllers only ever see typed, whitelisted data (unknown keys are stripped).
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const errors = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location] ?? {});
      if (!result.success) {
        errors.push(
          ...result.error.issues.map((issue) => ({
            location,
            field: issue.path.join('.'),
            message: issue.message,
          })),
        );
        continue;
      }

      if (location === 'query') {
        // Express 5 exposes req.query as a getter; shadow it with the parsed value.
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } else {
        req[location] = result.data;
      }
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest('Validation failed', { errors }));
    }
    return next();
  };
}
