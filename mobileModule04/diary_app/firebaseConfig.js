export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAul8bdgMHKozbQEcWjAzZmrmTtDQh22iU',
  authDomain: 'diary-1d8a9.firebaseapp.com',
  projectId: 'diary-1d8a9',
  storageBucket: 'diary-1d8a9.firebasestorage.app',
  messagingSenderId: '872905102438',
  appId: '1:872905102438:web:c648ce35bb4f1d133649a7',
};

export const OAUTH_CONFIG = {
  google: {
    // webClientId = "Web client (auto created by Google Service)" dans Google Cloud Console
    // PAS le client iOS ni Android. Firebase > Parametres > Vos applications > SDK Web.
    webClientId: '872905102438-i26rmcgmlamjunk8cj1codqjfidfj850.apps.googleusercontent.com',
    iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID',
  },
  github: {
    clientId: 'YOUR_GITHUB_CLIENT_ID',
  },
};
