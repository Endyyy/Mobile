import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

function HomeScreen({ onLoginPress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue</Text>
      <Pressable style={styles.button} onPress={onLoginPress}>
        <Text style={styles.buttonText}>Se connecter</Text>
      </Pressable>
    </View>
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
    backgroundColor: '#f8fafc',
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
  subtitle: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
