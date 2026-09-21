import 'dotenv/config';
import { runContentGenerationJob } from '../src/lib/jobs/runner';

async function main() {
  console.log('🚀 Manually triggering autonomous content generation job...');
  try {
    await runContentGenerationJob();
    console.log('✨ Content generation completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Content generation failed:', error);
    process.exit(1);
  }
}

main();
