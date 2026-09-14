import { ConfigSunatType } from './config-sunat.type';
import { ServerType } from './server.type';

export type ConfigLoaderType = {
  server: ServerType;
  sandBoxSunat: ConfigSunatType;
};
