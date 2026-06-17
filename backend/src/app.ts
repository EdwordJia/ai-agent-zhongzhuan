import type { Application } from 'express';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import clientRoutes from './routes/client';
import imageRoutes from './routes/images';

const app: Application = express();

const allowAll = process.env.CORS_ORIGINS === '*';
const allowedOrigins = allowAll
  ? []
  : process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:5174', 'http://localhost:5180'];

app.use(cors({
  origin: (origin, callback) => {
    if (allowAll || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS 策略拒绝来源: ${origin}`));
    }
  },
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
