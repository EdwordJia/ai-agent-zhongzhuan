import '../helpers/loadEnv';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../helpers/db';

async function getAdminToken() {
  const res = await request(app)
    .post('/api/auth/admin/login')
    .send({ username: 'admin', password: 'admin123' });
  return res.body.data.token;
}

async function getUserToken(machineId: string) {
  const res = await request(app)
    .post('/api/auth/machine')
    .send({ machine_id: machineId });
  return res.body.data.token;
}

async function redeemPoints(machineId: string, points: number) {
  const adminToken = await getAdminToken();
  const genRes = await request(app)
    .post('/api/admin/codes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ points, totalUses: 1, count: 1 });

  const code = genRes.body.data[0].code;
  const token = await getUserToken(machineId);
  await request(app)
    .post('/api/user/redeem')
    .set('Authorization', `Bearer ${token}`)
    .send({ code });
  return token;
}

describe('Concurrency safety', () => {
  it('should not deduct points below zero under concurrent paid generation', async () => {
    const machineId = 'concurrency-machine-001';
    const token = await redeemPoints(machineId, 125);

    const requests = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/images/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'concurrent', n: 1 })
    );

    const responses = await Promise.all(requests);

    const successCount = responses.filter((r) => r.status === 200).length;
    const failCount = responses.length - successCount;

    const user = await prisma.users.findUniqueOrThrow({ where: { machine_id: machineId } });
    expect(user.points).toBeGreaterThanOrEqual(0);
    expect(successCount).toBeLessThanOrEqual(5);
    expect(failCount).toBeGreaterThanOrEqual(5);
    expect(user.points).toBe(125 - successCount * 25);
  });
});
