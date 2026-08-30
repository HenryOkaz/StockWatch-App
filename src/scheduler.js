import cron from 'node-cron';
import { config } from './config.js';
import { runInventoryCheck } from './services/alertService.js';

let cronTask = null;
let isRunning = false;

export function startScheduler() {
  if (isRunning) {
    console.log('[Scheduler] Background job is already running.');
    return;
  }

  const intervalMinutes = config.checkIntervalMinutes || 60;
  // Create cron schedule: e.g. every X minutes
  // Format for every X minutes: "*/X * * * *"
  // If interval is >= 60, calculate hour pattern
  let cronExpression = `*/${intervalMinutes} * * * *`;

  if (intervalMinutes >= 60) {
    const hours = Math.max(1, Math.floor(intervalMinutes / 60));
    cronExpression = `0 */${hours} * * *`;
  }

  console.log(`[Scheduler] Starting background inventory monitor (Frequency: Every ${intervalMinutes} minutes -> Cron: "${cronExpression}")`);

  cronTask = cron.schedule(cronExpression, async () => {
    try {
      await runInventoryCheck({ manualTrigger: false });
    } catch (error) {
      console.error('[Scheduler Task Failed]', error.message);
    }
  });

  isRunning = true;

  // Run initial check on app startup after 5 second warmup delay
  setTimeout(() => {
    console.log('[Scheduler] Running initial startup inventory check...');
    runInventoryCheck({ manualTrigger: false }).catch(err => {
      console.error('[Scheduler Startup Check Error]', err.message);
    });
  }, 5000);
}

export function stopScheduler() {
  if (cronTask) {
    cronTask.stop();
    isRunning = false;
    console.log('[Scheduler] Background monitor stopped.');
  }
}

export function getSchedulerStatus() {
  return {
    isRunning,
    intervalMinutes: config.checkIntervalMinutes,
    cooldownHours: config.cooldownHours
  };
}
