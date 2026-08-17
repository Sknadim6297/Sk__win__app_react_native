const cron = require('node-cron');
const { runDailyGeneration } = require('../services/dailyAutoMatchService');
const { TIMEZONE } = require('../utils/indiaTime');

let started = false;

function startDailyAutoMatchJob() {
  if (started) {
    console.log('[DailyAutoMatch] Job already registered, skipping');
    return;
  }
  started = true;

  cron.schedule(
    '5 0 * * *',
    async () => {
      console.log('[DailyAutoMatch] Job started');
      try {
        const results = await runDailyGeneration();
        console.log(
          `[DailyAutoMatch] Job completed created=${results.created} exists=${results.alreadyExists} skipped=${results.skipped} errors=${results.errors}`
        );
      } catch (error) {
        console.error('[DailyAutoMatch] Job failed:', error.message);
      }
    },
    { timezone: TIMEZONE }
  );

  console.log('[DailyAutoMatch] Scheduler registered for 12:05 AM Asia/Kolkata');
}

module.exports = { startDailyAutoMatchJob };
