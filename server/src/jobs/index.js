import { logger } from '../config/logger.js';
import { expireLapsedSubscriptions } from './subscriptionExpiry.js';

const HOUR_MS = 60 * 60 * 1000;

const JOBS = [
  { name: 'subscription-expiry', intervalMs: HOUR_MS, run: () => expireLapsedSubscriptions() },
];

/** Starts in-process interval jobs. Returns a stop function for graceful shutdown. */
export function startJobs() {
  const timers = JOBS.map((job) => {
    const execute = () =>
      job
        .run()
        .catch((error) => logger.error({ err: error, job: job.name }, 'Scheduled job failed'));
    execute();
    const timer = setInterval(execute, job.intervalMs);
    timer.unref();
    return timer;
  });

  return () => timers.forEach(clearInterval);
}
