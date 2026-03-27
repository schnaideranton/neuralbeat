import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neuralbeat.puzzle',
  appName: 'NeuralBeat',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
