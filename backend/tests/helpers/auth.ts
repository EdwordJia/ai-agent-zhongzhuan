import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'openclaw-test-secret-key';

export function makeUserToken(user: { id: number; machine_id: string; points?: number }) {
  return jwt.sign(
    { id: user.id, machine_id: user.machine_id, points: user.points ?? 0, type: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export function makeAdminToken(admin: { id: number; username: string; role?: string }) {
  return jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role || 'super', type: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}
