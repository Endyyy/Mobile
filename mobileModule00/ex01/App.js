import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [displayText, setDisplayText] = useState('Welcome to Mobile App');

  const handleButtonPress = () => {
    console.log('Button pressed');
    setDisplayText(prevText => 
      prevText === 'Welcome to Mobile App' ? 'Hello World!' : 'Welcome to Mobile App'
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.text}>{displayText}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleButtonPress}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Press Me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.1, // 10% of screen width for responsive padding
  },
  text: {
    fontSize: width < 400 ? 18 : 24, // Responsive font size
    fontWeight: '600',
    color: '#333',
    marginBottom: height * 0.05, // 5% of screen height for spacing
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: width * 0.08, // Responsive horizontal padding
    paddingVertical: height * 0.02, // Responsive vertical padding
    borderRadius: 8,
    minWidth: width * 0.4, // Minimum button width based on screen
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: width < 400 ? 16 : 18, // Responsive font size
    fontWeight: '600',
  },
});

