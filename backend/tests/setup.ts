import './helpers/loadEnv';

import { beforeAll, afterAll } from 'vitest';
import { prisma, resetTables, seedTestAdmin, seedTestChannels } from './helpers/db';
import { createMockGateway } from './helpers/gateway';

declare global {
  // eslint-disable-next-line no-var
  var __testGateway: ReturnType<typeof createMockGateway> | undefined;
}

const gateway = globalThis.__testGateway ?? createMockGateway();
globalThis.__testGateway = gateway;

beforeAll(async () => {
  await gateway.start();
  await resetTables();
  await seedTestAdmin();
  await seedTestChannels(gateway.url);
});

afterAll(async () => {
  await resetTables();
  await prisma.$disconnect();
  await gateway.stop();
  globalThis.__testGateway = undefined;
});

export { gateway };
