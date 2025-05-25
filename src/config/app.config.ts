import { registerAs } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config();
export default registerAs('config', () => ({
  port: parseInt(process.env.PORT || '5500', 10) || 5500,
  nodeEnv: process.env.NODE_ENV,
  appKey: process.env.APP_KEY,
}));
