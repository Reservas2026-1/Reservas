export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    androidScheme?: string;
    url?: string;
    cleartext?: boolean;
  };
  plugins?: {
    [key: string]: any;
  };
}

const config: CapacitorConfig = {
  appId: 'com.reservas.indoorcycling',
  appName: 'Reservas Studio',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
