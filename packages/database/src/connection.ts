import mongoose from 'mongoose';
import { MAX_RETRIES } from './constants.js';

export async function connectDb(url?: string): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  const mongoUrl = url ?? process.env['MONGODB_URI'] ?? process.env['DATABASE_URL'];

  if (!mongoUrl) throw new Error('MongoDB URL is required');

  // ...existing code...
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(mongoUrl);
      console.log('MongoDB connected');
      return;
    } catch (err) {
      attempt++;
      console.error(`MongoDB connection attempt ${attempt} failed: ${err}`);
      if (attempt >= MAX_RETRIES) throw err;
      await new Promise((res) => setTimeout(res, Math.min(attempt * 1000, 5000)));
    }
  }
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
