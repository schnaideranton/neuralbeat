import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dropskins.puzzle',
  appName: 'DropSkins',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
