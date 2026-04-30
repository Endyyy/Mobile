import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initializeApp, getApps } from 'firebase/app';
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { FIREBASE_CONFIG, OAUTH_CONFIG } from './firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

const firebaseApp = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
let auth;
try {
  auth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(firebaseApp);
}
const db = getFirestore(firebaseApp);

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
  onLogout,
  isLoading,
  authUser,
  authError,
  canUseGoogle,
  canUseGithub,
}) {
  if (authUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Connecte avec succes</Text>
        <Text style={styles.subtitle}>Salut {authUser.displayName || authUser.email || 'Utilisateur'}</Text>
        <Text style={styles.subtitle}>UID: {authUser.uid}</Text>
        <Pressable style={styles.button} onPress={onLogout}>
          <Text style={styles.buttonText}>Se deconnecter</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onBackPress}>
          <Text style={styles.secondaryButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentification</Text>
      <Text style={styles.subtitle}>Choisis ton provider</Text>
      <Pressable
        style={[styles.socialButton, (!canUseGithub || isLoading) && styles.socialButtonDisabled]}
        onPress={onGithubLogin}
        disabled={!canUseGithub || isLoading}
      >
        <View style={styles.socialButtonContent}>
          <FontAwesome name="github" size={20} color="#111827" />
          <Text style={styles.socialButtonText}>Continuer avec GitHub</Text>
        </View>
      </Pressable>
      <Pressable
        style={[styles.socialButton, (!canUseGoogle || isLoading) && styles.socialButtonDisabled]}
        onPress={onGoogleLogin}
        disabled={!canUseGoogle || isLoading}
      >
        <View style={styles.socialButtonContent}>
          <FontAwesome name="google" size={20} color="#EA4335" />
          <Text style={styles.socialButtonText}>Continuer avec Google</Text>
        </View>
      </Pressable>
      {isLoading ? <Text style={styles.infoText}>Connexion en cours...</Text> : null}
      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      <Pressable style={styles.secondaryButton} onPress={onBackPress}>
        <Text style={styles.secondaryButtonText}>Retour</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [authUser, setAuthUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const githubDiscovery = useMemo(
    () => ({
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
    }),
    [],
  );

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    expoClientId: OAUTH_CONFIG.google.expoClientId,
    androidClientId: OAUTH_CONFIG.google.androidClientId,
    iosClientId: OAUTH_CONFIG.google.iosClientId,
    webClientId: OAUTH_CONFIG.google.webClientId,
    scopes: ['profile', 'email'],
  });

  const [githubRequest, githubResponse, promptGithubAsync] = AuthSession.useAuthRequest(
    {
      clientId: OAUTH_CONFIG.github.clientId,
      scopes: ['read:user', 'user:email'],
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'diaryapp' }),
    },
    githubDiscovery,
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
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
    const loginWithGoogleCredential = async () => {
      if (googleResponse?.type !== 'success') return;
      try {
        setIsLoading(true);
        setAuthError('');
        const { idToken, accessToken } = googleResponse.authentication ?? {};
        if (!idToken && !accessToken) {
          throw new Error('Token Google introuvable');
        }
        const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
        await signInWithCredential(auth, credential);
      } catch (error) {
        setAuthError(error.message || 'Erreur de connexion Google');
      } finally {
        setIsLoading(false);
      }
    };

    loginWithGoogleCredential();
  }, [googleResponse]);

  useEffect(() => {
    const loginWithGithubCredential = async () => {
      if (githubResponse?.type !== 'success') return;
      try {
        setIsLoading(true);
        setAuthError('');
        const accessToken = githubResponse.params?.access_token || githubResponse.authentication?.accessToken;
        if (!accessToken) {
          throw new Error('Token GitHub introuvable');
        }
        const credential = GithubAuthProvider.credential(accessToken);
        await signInWithCredential(auth, credential);
      } catch (error) {
        setAuthError(error.message || 'Erreur de connexion GitHub');
      } finally {
        setIsLoading(false);
      }
    };

    loginWithGithubCredential();
  }, [githubResponse]);

  const handleGoogleLogin = async () => {
    try {
      setAuthError('');
      await promptGoogleAsync();
    } catch (error) {
      setAuthError(error.message || 'Impossible de lancer la connexion Google');
    }
  };

  const handleGithubLogin = async () => {
    try {
      setAuthError('');
      await promptGithubAsync();
    } catch (error) {
      setAuthError(error.message || 'Impossible de lancer la connexion GitHub');
    }
  };

  const handleLogout = async () => {
    try {
      setAuthError('');
      await signOut(auth);
    } catch (error) {
      setAuthError(error.message || 'Erreur lors de la deconnexion');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {currentScreen === 'home' ? (
        <HomeScreen onLoginPress={() => setCurrentScreen('auth')} />
      ) : (
        <AuthScreen
          onBackPress={() => setCurrentScreen('home')}
          onGoogleLogin={handleGoogleLogin}
          onGithubLogin={handleGithubLogin}
          onLogout={handleLogout}
          isLoading={isLoading}
          authUser={authUser}
          authError={authError}
          canUseGoogle={Boolean(googleRequest)}
          canUseGithub={Boolean(githubRequest)}
        />
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  socialButton: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 12,
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
