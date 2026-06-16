import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import {
  GoogleSignin,
  GoogleSigninButton,
  isCancelledResponse,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
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
  onLogout,
  isLoading,
  authUser,
  authError,
  canUseGoogle,
  canUseGithub,
  isGithubModalVisible,
  githubAuthUrl,
  onCloseGithubModal,
  onGithubWebViewRequest,
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
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Light}
        style={[styles.googleButton, (!canUseGoogle || isLoading) && styles.socialButtonDisabled]}
        onPress={onGoogleLogin}
        disabled={!canUseGoogle || isLoading}
      />
      {isLoading ? <Text style={styles.infoText}>Connexion en cours...</Text> : null}
      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      <Pressable style={styles.secondaryButton} onPress={onBackPress}>
        <Text style={styles.secondaryButtonText}>Retour</Text>
      </Pressable>
      <Modal visible={isGithubModalVisible} animationType="slide" onRequestClose={onCloseGithubModal}>
        <SafeAreaView style={styles.githubModalContainer}>
          <View style={styles.githubModalHeader}>
            <Text style={styles.githubModalTitle}>Connexion GitHub</Text>
            <Pressable style={styles.secondaryButton} onPress={onCloseGithubModal}>
              <Text style={styles.secondaryButtonText}>Fermer</Text>
            </Pressable>
          </View>
          {githubAuthUrl ? (
            <WebView
              source={{ uri: githubAuthUrl }}
              onShouldStartLoadWithRequest={onGithubWebViewRequest}
              startInLoadingState
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [authUser, setAuthUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isGithubModalVisible, setIsGithubModalVisible] = useState(false);
  const [githubAuthUrl, setGithubAuthUrl] = useState('');
  const [githubOauthState, setGithubOauthState] = useState('');

  const githubDiscovery = useMemo(
    () => ({
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
    }),
    [],
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

  const handleGoogleLogin = async () => {
    if (!isGoogleConfigured) {
      setAuthError('Configuration Google OAuth manquante dans firebaseConfig.js');
      return;
    }

    try {
      setIsLoading(true);
      setAuthError('');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response)) {
        throw new Error('Connexion Google invalide');
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error('Token Google introuvable');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
      setAuthError(error.message || 'Erreur de connexion Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    if (!isGithubConfigured) {
      setAuthError('Configuration GitHub OAuth manquante dans firebaseConfig.js');
      return;
    }

    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'diaryapp' });
    const state = Math.random().toString(36).slice(2, 12);
    const params = new URLSearchParams({
      client_id: OAUTH_CONFIG.github.clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      response_type: 'token',
      state,
    });

    setGithubOauthState(state);
    setGithubAuthUrl(`${githubDiscovery.authorizationEndpoint}?${params.toString()}`);
    setIsGithubModalVisible(true);
    setAuthError('');
  };

  const handleGithubWebViewRequest = (request) => {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'diaryapp' });
    if (!request.url.startsWith(redirectUri)) return true;

    const fragment = request.url.split('#')[1] ?? '';
    const fragmentParams = new URLSearchParams(fragment);
    const accessToken = fragmentParams.get('access_token');
    const state = fragmentParams.get('state');
    const errorDescription = fragmentParams.get('error_description');

    const completeGithubLogin = async () => {
      try {
        setIsLoading(true);
        if (errorDescription) {
          throw new Error(errorDescription);
        }
        if (!accessToken) {
          throw new Error('Token GitHub introuvable');
        }
        if (!state || state !== githubOauthState) {
          throw new Error('Etat OAuth GitHub invalide');
        }
        const credential = GithubAuthProvider.credential(accessToken);
        await signInWithCredential(auth, credential);
        setGithubAuthUrl('');
        setGithubOauthState('');
      } catch (error) {
        setAuthError(error.message || 'Erreur de connexion GitHub');
      } finally {
        setIsGithubModalVisible(false);
        setIsLoading(false);
      }
    };

    completeGithubLogin();
    return false;
  };

  const handleCloseGithubModal = () => {
    setIsGithubModalVisible(false);
    setGithubAuthUrl('');
    setGithubOauthState('');
  };

  const handleLogout = async () => {
    try {
      setAuthError('');
      await signOut(auth);
      if (isGoogleConfigured) {
        await GoogleSignin.signOut();
      }
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
          canUseGoogle={isGoogleConfigured}
          canUseGithub={isGithubConfigured}
          isGithubModalVisible={isGithubModalVisible}
          githubAuthUrl={githubAuthUrl}
          onCloseGithubModal={handleCloseGithubModal}
          onGithubWebViewRequest={handleGithubWebViewRequest}
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
  googleButton: {
    width: '100%',
    maxWidth: 320,
    height: 48,
  },
  githubModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  githubModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  githubModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
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
