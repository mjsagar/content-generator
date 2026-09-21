let isCronRunning = false;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !isCronRunning) {
    console.log('Registering Next.js instrumentation (Node.js runtime)...');
    isCronRunning = true;

    startWorker();
  }
}

async function startWorker() {
  await new Promise(resolve => setTimeout(resolve, 10000));

  setInterval(async () => {
    try {
      console.log('Triggering background job via internal API...');
      const url = `http://localhost:${process.env.PORT || 3000}/api/cron`;
      await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
        }
      });
    } catch (err) {
      console.error('Error triggering local cron job', err);
    }
  }, 10 * 60 * 1000);
}
