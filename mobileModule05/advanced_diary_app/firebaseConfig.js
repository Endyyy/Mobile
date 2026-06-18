const env = (key) => process.env[key] ?? '';

export const FIREBASE_CONFIG = {
  apiKey: env('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: env('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: env('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: env('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

export const OAUTH_CONFIG = {
  google: {
    webClientId: env('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
    iosClientId: env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
  },
  github: {
    clientId: env('EXPO_PUBLIC_GITHUB_CLIENT_ID'),
    clientSecret: env('EXPO_PUBLIC_GITHUB_CLIENT_SECRET'),
  },
};
