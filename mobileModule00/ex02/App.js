import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  Platform, 
  StatusBar 
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

export default function App() {
  const { width } = Dimensions.get('window');
  const buttonSpacing = width * 0.02;
  const buttonSize = (width - (buttonSpacing * 5)) / 4;

  const handleButtonPress = (buttonText) => {
    console.log(buttonText);
  };

  const renderButton = (text, buttonStyle = {}, textStyle = {}) => (
    <TouchableOpacity
      style={[styles.button, buttonStyle]}
      onPress={() => handleButtonPress(text)}
      activeOpacity={0.7}
    >
      <Text style={[styles.buttonText, textStyle]}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor="#2d2d2d" />
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Calculator</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.displayContainer}>
          <TextInput
            style={styles.expressionField}
            value="0"
            editable={false}
            placeholder="0"
          />
          <TextInput
            style={styles.resultField}
            value="0"
            editable={false}
            placeholder="0"
          />
        </View>
        
        <View style={styles.buttonsContainer}>
          <View style={styles.buttonRow}>
            {renderButton('AC', styles.operatorButton, styles.operatorButtonText)}
            {renderButton('C', styles.operatorButton, styles.operatorButtonText)}
            {renderButton('/', styles.operatorButton, styles.operatorButtonText)}
            {renderButton('*', styles.operatorButton, styles.operatorButtonText)}
          </View>
          <View style={styles.buttonRow}>
            {renderButton('7')}
            {renderButton('8')}
            {renderButton('9')}
            {renderButton('-', styles.operatorButton, styles.operatorButtonText)}
          </View>
          <View style={styles.buttonRow}>
            {renderButton('4')}
            {renderButton('5')}
            {renderButton('6')}
            {renderButton('+', styles.operatorButton, styles.operatorButtonText)}
          </View>
          <View style={styles.buttonRow}>
            {renderButton('1')}
            {renderButton('2')}
            {renderButton('3')}
            {renderButton('=', styles.equalsButton, styles.equalsButtonText)}
          </View>
          <View style={styles.buttonRow}>
            {renderButton('0', styles.zeroButton)}
            {renderButton('.')}
            <View style={{ width: buttonSize }} />
          </View>
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

// Responsive calculations
const isTablet = width >= 600;
const buttonSpacing = width * 0.02;
const buttonSize = (width - (buttonSpacing * 5)) / 4;
const displayHeight = height * 0.15;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  appBar: {
    backgroundColor: '#2d2d2d',
    paddingTop: statusBarHeight,
    paddingBottom: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  appBarTitle: {
    color: '#ffffff',
    fontSize: isTablet ? 22 : 18,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: buttonSpacing,
  },
  displayContainer: {
    marginBottom: buttonSpacing * 2,
    marginTop: buttonSpacing,
  },
  expressionField: {
    backgroundColor: '#252525',
    height: displayHeight * 0.4,
    fontSize: isTablet ? 18 : 14,
    paddingHorizontal: 20,
    textAlign: 'right',
    borderRadius: 12,
    marginBottom: buttonSpacing,
    color: '#888',
    borderWidth: 0,
  },
  resultField: {
    backgroundColor: '#252525',
    height: displayHeight * 0.6,
    fontSize: isTablet ? 36 : 32,
    paddingHorizontal: 20,
    textAlign: 'right',
    borderRadius: 12,
    fontWeight: '300',
    color: '#ffffff',
    borderWidth: 0,
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: buttonSpacing,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: buttonSpacing * 1.2,
  },
  button: {
    width: buttonSize,
    height: buttonSize,
    backgroundColor: '#2d2d2d',
    borderRadius: buttonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    borderWidth: 0,
  },
  zeroButton: {
    width: buttonSize * 2 + buttonSpacing,
  },
  operatorButton: {
    backgroundColor: '#3a3a3a',
  },
  equalsButton: {
    backgroundColor: '#4a9eff',
  },
  buttonText: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '400',
    color: '#ffffff',
  },
  operatorButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  equalsButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
});

