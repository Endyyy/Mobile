function getGoogleIosUrlScheme(webClientId) {
  if (!webClientId) return '';
  const clientIdPart = webClientId.replace('.apps.googleusercontent.com', '');
  return `com.googleusercontent.apps.${clientIdPart}`;
}

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

module.exports = {
  expo: {
    name: 'diary_app',
    slug: 'diary-app',
    scheme: 'diaryapp',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.achretie.diaryapp',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#ffffff',
      },
      package: 'com.achretie.diaryapp',
    },
    web: {},
    plugins: [
      'expo-web-browser',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: getGoogleIosUrlScheme(googleWebClientId),
        },
      ],
    ],
  },
};
