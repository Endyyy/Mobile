import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { ImageBackground, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

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

function AuthScreen({ onBackPress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentification</Text>
      <Pressable style={styles.socialButton} onPress={() => {}}>
        <View style={styles.socialButtonContent}>
          <FontAwesome name="github" size={20} color="#111827" />
          <Text style={styles.socialButtonText}>Continuer avec GitHub</Text>
        </View>
      </Pressable>
      <Pressable style={styles.socialButton} onPress={() => {}}>
        <View style={styles.socialButtonContent}>
          <FontAwesome name="google" size={20} color="#EA4335" />
          <Text style={styles.socialButtonText}>Continuer avec Google</Text>
        </View>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={onBackPress}>
        <Text style={styles.secondaryButtonText}>Retour</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');

  return (
    <SafeAreaView style={styles.safeArea}>
      {currentScreen === 'home' ? (
        <HomeScreen onLoginPress={() => setCurrentScreen('auth')} />
      ) : (
        <AuthScreen onBackPress={() => setCurrentScreen('home')} />
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
});
