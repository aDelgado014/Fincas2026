import { SeedService } from '../services/seed.service.ts';

async function main() {
  try {
    await SeedService.runSeed();
    process.exit(0);
  } catch (error) {
    console.error('Error in seed:', error);
    process.exit(1);
  }
}

main();
