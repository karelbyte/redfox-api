import { ConfigLoaderType } from '../types/config.type';

export const configLoader = (): ConfigLoaderType => ({
  server: {
    port: parseInt(process.env.PORT!, 10),
    applicationName: process.env.APP_NAME! || 'Redfox API',
  },
  sandBoxSunat: {
    sandBoxSunatUrl: process.env.SAND_BOX_SUNAT!,
    sandBoxSunatToken: process.env.SAND_BOX_SUNAT_TOKEN!,
  },
});
