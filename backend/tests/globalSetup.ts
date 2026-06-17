import './helpers/loadEnv';

import { prisma, resetTables, seedTestAdmin, seedTestChannels } from './helpers/db';
import { createMockGateway } from './helpers/gateway';

const gateway = createMockGateway();

export default async function setup() {
  await gateway.start();
  await resetTables();
  await seedTestAdmin();
  await seedTestChannels(gateway.url);

  return async () => {
    await resetTables();
    await prisma.$disconnect();
    await gateway.stop();
  };
}

export { gateway };
