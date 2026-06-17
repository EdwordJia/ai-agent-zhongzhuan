import '../helpers/loadEnv';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { gateway } from '../setup';
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

async function getUserPoints(token: string) {
  const res = await request(app)
    .get('/api/user/points')
    .set('Authorization', `Bearer ${token}`);
  return res.body.data.points;
}

describe('Image Generation API', () => {
  beforeEach(() => {
    gateway.setResponse(200, null as any);
  });

  it('should generate with paid channel and deduct points', async () => {
    const token = await redeemPoints('image-paid-001', 1000);
    const before = await getUserPoints(token);
    expect(before).toBe(1000);

    const res = await request(app)
      .post('/api/images/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'a cat', n: 2 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.images).toHaveLength(2);

    const after = await getUserPoints(token);
    expect(after).toBe(1000 - 2 * 25);

    const user = await prisma.users.findUniqueOrThrow({ where: { machine_id: 'image-paid-001' } });
    const logs = await prisma.generation_logs.findMany({ where: { user_id: user.id } });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs.find((l) => l.prompt === 'a cat');
    expect(log).toBeDefined();
    expect(log?.points_cost).toBe(2 * 25);
  });

  it('should fall back to free channel when user has no points', async () => {
    const token = await getUserToken('image-free-001');

    const res = await request(app)
      .post('/api/images/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'a dog', n: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.images).toHaveLength(1);

    const after = await getUserPoints(token);
    expect(after).toBe(0);
  });

  it('should reject free generation beyond daily limit', async () => {
    const token = await getUserToken('image-free-limit-001');

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/images/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'a bird', n: 1 })
        .expect(200);
    }

    const res = await request(app)
      .post('/api/images/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'a bird', n: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject generation when points are insufficient and free fallback is exhausted', async () => {
    const adminToken = await getAdminToken();
    const freeChannel = await prisma.channels.findFirstOrThrow({ where: { type: 'free' } });
    await request(app)
      .put(`/api/admin/channels/${freeChannel.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ daily_free_limit: 0 })
      .expect(200);

    const token = await redeemPoints('image-insufficient-001', 10);

    const res = await request(app)
      .post('/api/images/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'expensive', n: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);

    const after = await getUserPoints(token);
    expect(after).toBe(10);
  });

  it('should refund points when gateway fails', async () => {
    const token = await redeemPoints('image-refund-001', 1000);
    gateway.setResponse(500, { data: [] });

    const res = await request(app)
      .post('/api/images/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'fail', n: 1 })
      .expect(500);

    expect(res.body.success).toBe(false);

    const after = await getUserPoints(token);
    expect(after).toBe(1000);
  });
});
