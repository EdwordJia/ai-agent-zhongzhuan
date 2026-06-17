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

describe('Admin API', () => {
  it('should return current admin info', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('admin');
  });

  it('should CRUD channels', async () => {
    const token = await getAdminToken();

    const createRes = await request(app)
      .post('/api/admin/channels')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Admin Test Channel',
        type: 'paid',
        gateway_url: 'http://localhost:11111/',
        api_key: 'key',
        model: 'test-model',
        cost_per_image: 50,
        priority: 99,
        daily_free_limit: 0,
        is_active: true,
      })
      .expect(200);

    const channelId = createRes.body.data.id;
    expect(createRes.body.data.name).toBe('Admin Test Channel');

    const listRes = await request(app)
      .get('/api/admin/channels')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body.data.some((c: any) => c.id === channelId)).toBe(true);

    await request(app)
      .put(`/api/admin/channels/${channelId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Admin Test Channel Updated' })
      .expect(200);

    await request(app)
      .delete(`/api/admin/channels/${channelId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should generate and list redemption codes', async () => {
    const token = await getAdminToken();

    const genRes = await request(app)
      .post('/api/admin/codes')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 100, totalUses: 5, count: 3 })
      .expect(200);

    expect(genRes.body.data).toHaveLength(3);

    const listRes = await request(app)
      .get('/api/admin/codes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.data.list.length).toBeGreaterThanOrEqual(3);
  });

  it('should toggle redemption code status', async () => {
    const token = await getAdminToken();

    const genRes = await request(app)
      .post('/api/admin/codes')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 100, totalUses: 1, count: 1 })
      .expect(200);

    const codeId = genRes.body.data[0].id;

    const patchRes = await request(app)
      .patch(`/api/admin/codes/${codeId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_active: false })
      .expect(200);

    expect(patchRes.body.data.is_active).toBe(false);
  });

  it('should list users and adjust points', async () => {
    const token = await getAdminToken();

    await request(app)
      .post('/api/auth/machine')
      .send({ machine_id: 'admin-user-001' });

    const listRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const user = listRes.body.data.list.find((u: any) => u.machine_id === 'admin-user-001');
    expect(user).toBeDefined();

    await request(app)
      .post(`/api/admin/users/${user.id}/points`)
      .set('Authorization', `Bearer ${token}`)
      .send({ delta: 500 })
      .expect(200);

    const pointsRes = await request(app)
      .get('/api/user/points')
      .set('Authorization', `Bearer ${await userToken('admin-user-001')}`)
      .expect(200);

    expect(pointsRes.body.data.points).toBe(500);
  });

  it('should return dashboard stats', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.totalUsers).toBe('number');
  });
});

async function userToken(machineId: string) {
  const res = await request(app)
    .post('/api/auth/machine')
    .send({ machine_id: machineId });
  return res.body.data.token;
}
