import express from 'express';
import cors from 'cors';

import authRoutes from './auth/auth.routes.js';
import adminRoutes from './admin/admin.routes.js';
import clientRoutes from './clients/client.routes.js';
import errorMiddleware from './middlewares/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/admin', adminRoutes);
app.use('/', clientRoutes);
app.use('/auth', authRoutes);

app.use(errorMiddleware);

export default app;
