import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { GoogleSignin, GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { OAUTH_CONFIG } from './firebaseConfig';
import ProfileScreen from './screens/ProfileScreen';

WebBrowser.maybeCompleteAuthSession();

const GITHUB_DISCOVERY = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};

const isConfigured = (value) => Boolean(value) && !value.startsWith('YOUR_');

function HomeScreen({ onLoginPress }) {
  return (
    <ImageBackground source={require('./assets/real_background.png')} style={styles.homeBackground} resizeMode="cover">
      <View style={styles.homeOverlay}>
        <Text style={styles.welcomeTitle}>Bienvenue</Text>
        <Pressable style={styles.button} onPress={onLoginPress}>
          <Text style={styles.buttonText}>Se connecter</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

function AuthScreen({
  onBackPress,
  onGoogleLogin,
  onGithubLogin,
  isLoading,
  authError,
  canUseGoogle,
  canUseGithub,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication</Text>
      <Text style={styles.subtitle}>Choose your provider</Text>
      <Pressable
        style={[styles.githubButton, (!canUseGithub || isLoading) && styles.socialButtonDisabled]}
        onPress={onGithubLogin}
        disabled={!canUseGithub || isLoading}
      >
        <View style={styles.socialButtonContent}>
          <FontAwesome name="github" size={20} color="#111827" />
          <Text style={styles.socialButtonText}>Sign in with GitHub</Text>
        </View>
      </Pressable>
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Light}
        style={[styles.googleButton, (!canUseGoogle || isLoading) && styles.socialButtonDisabled]}
        onPress={onGoogleLogin}
        disabled={!canUseGoogle || isLoading}
      />
      {isLoading ? <Text style={styles.infoText}>Signing in...</Text> : null}
      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      <Pressable style={styles.secondaryButton} onPress={onBackPress}>
        <Text style={styles.secondaryButtonText}>Back</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [authUser, setAuthUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const signingIn = useRef(false);

  const githubRedirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: 'diaryapp' }), []);
  const [githubRequest, , githubPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: OAUTH_CONFIG.github.clientId,
      scopes: ['read:user', 'user:email'],
      redirectUri: githubRedirectUri,
      responseType: AuthSession.ResponseType.Token,
    },
    GITHUB_DISCOVERY,
  );

  const isGoogleConfigured = isConfigured(OAUTH_CONFIG.google.webClientId);
  const isGithubConfigured = isConfigured(OAUTH_CONFIG.github.clientId);

  useEffect(() => {
    if (!isGoogleConfigured) return;
    GoogleSignin.configure({
      webClientId: OAUTH_CONFIG.google.webClientId,
      ...(isConfigured(OAUTH_CONFIG.google.iosClientId) && {
        iosClientId: OAUTH_CONFIG.google.iosClientId,
      }),
    });
  }, [isGoogleConfigured]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setIsAuthReady(true);

      if (!user) return;

      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? '',
          photoURL: user.photoURL ?? '',
          providerId: user.providerData?.[0]?.providerId ?? '',
          lastLoginAt: serverTimestamp(),
        },
        { merge: true },
      );
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    if (authUser) {
      setCurrentScreen('profile');
      return;
    }

    if (currentScreen === 'profile') {
      setCurrentScreen('home');
    }
  }, [authUser, isAuthReady, currentScreen]);

  const handleGoogleLogin = async () => {
    if (signingIn.current) return;
    if (!isGoogleConfigured) {
      setAuthError('Missing Google OAuth configuration in firebaseConfig.js');
      return;
    }

    signingIn.current = true;
    try {
      setIsLoading(true);
      setAuthError('');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const { data } = await GoogleSignin.signIn();

      if (data?.idToken) {
        const credential = GoogleAuthProvider.credential(data.idToken);
        await signInWithCredential(auth, credential);
      } else {
        throw new Error('Google ID token not found. Check webClientId in firebaseConfig.js.');
      }
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
      console.error('Google Sign-In Error:', error);
      if (error?.code === statusCodes.DEVELOPER_ERROR) {
        setAuthError(
          'DEVELOPER_ERROR: add your debug SHA-1 in Firebase for package com.achretie.diaryapp and use the Web OAuth client as webClientId. Run: npm run android:sha1',
        );
        return;
      }
      setAuthError(error.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
      signingIn.current = false;
    }
  };

  const handleGithubLogin = async () => {
    if (signingIn.current) return;
    if (!isGithubConfigured) {
      setAuthError('Missing GitHub OAuth configuration in firebaseConfig.js');
      return;
    }
    if (!githubRequest) {
      setAuthError('GitHub sign-in is not ready yet');
      return;
    }

    signingIn.current = true;
    try {
      setIsLoading(true);
      setAuthError('');
      const result = await githubPromptAsync();

      if (result.type === 'cancel' || result.type === 'dismiss') return;
      if (result.type !== 'success') {
        throw new Error('Invalid GitHub sign-in response');
      }

      const accessToken = result.params.access_token;
      if (!accessToken) {
        throw new Error('GitHub access token not found');
      }

      const credential = GithubAuthProvider.credential(accessToken);
      await signInWithCredential(auth, credential);
    } catch (error) {
      console.error('GitHub Sign-In Error:', error);
      setAuthError(error.message || 'GitHub sign-in failed');
    } finally {
      setIsLoading(false);
      signingIn.current = false;
    }
  };

  const handleLogout = async () => {
    try {
      setAuthError('');
      await signOut(auth);
      if (isGoogleConfigured) {
        await GoogleSignin.signOut();
      }
      setCurrentScreen('home');
    } catch (error) {
      setAuthError(error.message || 'Sign-out failed');
    }
  };

  if (!isAuthReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.infoText}>Loading...</Text>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {currentScreen === 'home' ? (
        <HomeScreen onLoginPress={() => setCurrentScreen('auth')} />
      ) : null}
      {currentScreen === 'auth' ? (
        <AuthScreen
          onBackPress={() => setCurrentScreen('home')}
          onGoogleLogin={handleGoogleLogin}
          onGithubLogin={handleGithubLogin}
          isLoading={isLoading}
          authError={authError}
          canUseGoogle={isGoogleConfigured}
          canUseGithub={isGithubConfigured}
        />
      ) : null}
      {currentScreen === 'profile' && authUser ? (
        <ProfileScreen authUser={authUser} onLogout={handleLogout} />
      ) : null}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  homeBackground: {
    flex: 1,
    width: '100%',
  },
  homeOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    paddingHorizontal: 24,
    gap: 18,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  welcomeTitle: {
    fontSize: 44,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(15, 23, 42, 0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.8)',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonText: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  githubButton: {
    width: '100%',
    maxWidth: 320,
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  googleButton: {
    width: '100%',
    maxWidth: 320,
    height: 48,
  },
  infoText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
});
