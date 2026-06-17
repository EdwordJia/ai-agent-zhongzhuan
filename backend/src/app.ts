import type { Application } from 'express';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import clientRoutes from './routes/client';
import imageRoutes from './routes/images';

const app: Application = express();

app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5180'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', clientRoutes);
app.use('/api/images', imageRoutes);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'ok' });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

export { app };
