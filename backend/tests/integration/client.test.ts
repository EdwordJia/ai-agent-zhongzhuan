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

describe('Client API (points & redeem)', () => {
  it('should return zero points for a new user', async () => {
    const token = await getUserToken('points-machine-001');
    const res = await request(app)
      .get('/api/user/points')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.points).toBe(0);
    expect(res.body.data.free_daily_used).toBe(0);
  });

  it('should redeem a code and increase points', async () => {
    const adminToken = await getAdminToken();
    const genRes = await request(app)
      .post('/api/admin/codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ points: 1000, totalUses: 1, count: 1 })
      .expect(200);

    const code = genRes.body.data[0].code;

    const userToken = await getUserToken('redeem-machine-001');
    const res = await request(app)
      .post('/api/user/redeem')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.points).toBe(1000);

    const pointsRes = await request(app)
      .get('/api/user/points')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(pointsRes.body.data.points).toBe(1000);
  });

  it('should reject an invalid redemption code', async () => {
    const token = await getUserToken('redeem-machine-002');
    const res = await request(app)
      .post('/api/user/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'INVALID1' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject a code that has been fully used', async () => {
    const adminToken = await getAdminToken();
    const genRes = await request(app)
      .post('/api/admin/codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ points: 500, totalUses: 1, count: 1 })
      .expect(200);

    const code = genRes.body.data[0].code;

    const firstToken = await getUserToken('redeem-machine-003');
    await request(app)
      .post('/api/user/redeem')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ code })
      .expect(200);

    const secondToken = await getUserToken('redeem-machine-004');
    const res = await request(app)
      .post('/api/user/redeem')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ code })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
