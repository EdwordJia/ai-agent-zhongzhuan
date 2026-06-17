import '../helpers/loadEnv';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('Auth API', () => {
  it('should register a new machine user and return a token', async () => {
    const res = await request(app)
      .post('/api/auth/machine')
      .send({ machine_id: 'test-machine-001' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.machine_id).toBe('test-machine-001');
    expect(res.body.data.user.points).toBe(0);
  });

  it('should return existing user token for the same machine_id', async () => {
    const first = await request(app)
      .post('/api/auth/machine')
      .send({ machine_id: 'test-machine-002' });

    const second = await request(app)
      .post('/api/auth/machine')
      .send({ machine_id: 'test-machine-002' });

    expect(second.body.data.user.id).toBe(first.body.data.user.id);
  });

  it('should login admin with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.admin.username).toBe('admin');
  });

  it('should reject admin login with bad password', async () => {
    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});
