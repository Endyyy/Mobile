import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { GoogleSignin, GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageBackground, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
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
  isGithubModalVisible,
  githubAuthUrl,
  onCloseGithubModal,
  onGithubWebViewRequest,
}) {
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
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isGithubModalVisible, setIsGithubModalVisible] = useState(false);
  const [githubAuthUrl, setGithubAuthUrl] = useState('');
  const [githubOauthState, setGithubOauthState] = useState('');
  const signingIn = useRef(false);

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
      setAuthError('Configuration Google OAuth manquante dans firebaseConfig.js');
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
        throw new Error(
          'Token Google introuvable. Utilisez le client Web Firebase (pas le client iOS/Android) dans webClientId.',
        );
      }
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
      console.error('Google Sign-In Error:', error);
      if (error?.code === statusCodes.DEVELOPER_ERROR) {
        setAuthError(
          'DEVELOPER_ERROR : ajoutez le SHA-1 debug dans Firebase (projet diary-1d8a9) pour le package com.achretie.diaryapp, puis utilisez le client Web OAuth comme webClientId. Lancez: npm run android:sha1',
        );
        return;
      }
      setAuthError(error.message || 'Erreur de connexion Google');
    } finally {
      setIsLoading(false);
      signingIn.current = false;
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
      setCurrentScreen('home');
    } catch (error) {
      setAuthError(error.message || 'Erreur lors de la deconnexion');
    }
  };

  if (!isAuthReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.infoText}>Chargement...</Text>
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
          isGithubModalVisible={isGithubModalVisible}
          githubAuthUrl={githubAuthUrl}
          onCloseGithubModal={handleCloseGithubModal}
          onGithubWebViewRequest={handleGithubWebViewRequest}
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
