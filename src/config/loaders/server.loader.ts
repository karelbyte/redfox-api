import { registerAs } from '@nestjs/config';

import { configLoader } from './config.loader';
import { ServerType } from '../types/server.type';

export const serverConfigLoader = registerAs(
  'server',
  (): ServerType => configLoader().server,
);
