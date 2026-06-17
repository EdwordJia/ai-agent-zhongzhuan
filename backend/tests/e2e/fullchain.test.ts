import '../helpers/loadEnv';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

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

describe('Full-chain smoke test', () => {
  it('should register, redeem, generate paid and free images, and update dashboard', async () => {
    const machineId = 'fullchain-machine-001';
    const userToken = await getUserToken(machineId);

    const pointsBefore = await request(app)
      .get('/api/user/points')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(pointsBefore.body.data.points).toBe(0);

    const adminToken = await getAdminToken();
    const codeRes = await request(app)
      .post('/api/admin/codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ points: 1000, totalUses: 1, count: 1 })
      .expect(200);
    const code = codeRes.body.data[0].code;

    await request(app)
      .post('/api/user/redeem')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code })
      .expect(200);

    const pointsAfterRedeem = await request(app)
      .get('/api/user/points')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(pointsAfterRedeem.body.data.points).toBe(1000);

    const dashboardBefore = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const totalUsedBefore = dashboardBefore.body.data.totalUsed;

    const paidRes = await request(app)
      .post('/api/images/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'a futuristic city', n: 2 })
      .expect(200);
    expect(paidRes.body.success).toBe(true);
    expect(paidRes.body.data.images).toHaveLength(2);

    const pointsAfterPaid = await request(app)
      .get('/api/user/points')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(pointsAfterPaid.body.data.points).toBe(1000 - 2 * 25);

    const paidChannel = await request(app)
      .get('/api/admin/channels')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const paidChannelId = paidChannel.body.data.find((c: any) => c.type === 'paid').id;

    await request(app)
      .put(`/api/admin/channels/${paidChannelId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false })
      .expect(200);

    const freeRes = await request(app)
      .post('/api/images/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ prompt: 'a tree', n: 1 })
      .expect(200);
    expect(freeRes.body.success).toBe(true);

    await request(app)
      .put(`/api/admin/channels/${paidChannelId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: true })
      .expect(200);

    const dashboard = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(dashboard.body.data.totalUsers).toBeGreaterThanOrEqual(1);
    expect(dashboard.body.data.totalUsed - totalUsedBefore).toBe(2 * 25);

    const logs = await request(app)
      .get('/api/admin/logs/generations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(logs.body.data.list.length).toBeGreaterThanOrEqual(2);
  });
});
