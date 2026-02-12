import React, { useState } from 'react';
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
import Mexp from 'math-expression-evaluator';

export default function App() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');

  const { width } = Dimensions.get('window');
  const buttonSpacing = width * 0.02;
  const buttonSize = (width - (buttonSpacing * 5)) / 4;

  const evaluateExpression = (expr) => {
    try {
      if (!expr || expr.trim() === '') {
        return '0';
      }

      // Remove spaces
      let sanitized = expr.replace(/\s/g, '');
      
      // Don't evaluate if expression ends with an operator (except for negative numbers)
      const operators = ['+', '*', '/'];
      const lastChar = sanitized[sanitized.length - 1];
      if (operators.includes(lastChar)) {
        // If ends with operator, evaluate without it
        sanitized = sanitized.slice(0, -1);
      }
      
      if (!sanitized || sanitized === '') {
        return '0';
      }

      // Use math-expression-evaluator to safely evaluate the expression
      const result = Mexp.eval(sanitized);
      
      // Check for invalid results (NaN)
      if (isNaN(result)) {
        return 'Error';
      }
      
      // Check for Infinity (division by zero, etc.)
      if (result === Infinity || result === -Infinity) {
        return 'Error';
      }
      
      // Check if result is a valid number
      // Use typeof to check if it's a number, and then check if it's finite
      if (typeof result !== 'number') {
        return 'Error';
      }
      
      // For very large numbers, always use scientific notation instead of rejecting
      const absResult = Math.abs(result);
      
      // JavaScript's Number.MAX_SAFE_INTEGER is 2^53 - 1 (about 9e15)
      // For numbers larger than 1e12, use scientific notation to avoid precision issues
      if (absResult >= 1e12 || (absResult < 1e-6 && absResult > 0)) {
        // Use scientific notation for very large or very small numbers
        try {
          const scientific = result.toExponential(10);
          // Clean up: remove trailing zeros after decimal, remove + sign in exponent
          return scientific.replace(/\.?0+e/, 'e').replace(/e\+/, 'e');
        } catch (e) {
          // If toExponential fails, the number might be too large
          return 'Error';
        }
      }

      // For normal numbers, format normally and remove trailing zeros
      let formatted = result.toString();
      
      // Handle very long decimal numbers (precision issues)
      if (formatted.length > 15 && formatted.includes('.')) {
        // If number is too long, use scientific notation
        const scientific = result.toExponential(10);
        return scientific.replace(/\.?0+e/, 'e').replace(/e\+/, 'e');
      }
      
      // Remove trailing zeros for decimal numbers
      if (formatted.includes('.')) {
        formatted = formatted.replace(/\.?0+$/, '');
      }
      
      return formatted;
    } catch (e) {
      console.error('Evaluation error:', e, 'Expression:', expr);
      return 'Error';
    }
  };

  const handleButtonPress = (buttonText) => {

    // AC: Clear everything - expression and result
    if (buttonText === 'AC') {
      setExpression('');
      setResult('0');
      return;
    }

    // C: Delete last character of expression
    if (buttonText === 'C') {
      if (expression.length === 0) {
        // If expression is already empty, ensure result is "0"
        setResult('0');
        return;
      }
      const newExpr = expression.slice(0, -1);
      setExpression(newExpr);
      // Only reset result to "0" if expression becomes empty
      if (newExpr.length === 0) {
        setResult('0');
      }
      // Don't recalculate result - wait for "=" button
      return;
    }

    // =: Calculate and display result
    if (buttonText === '=') {
      if (!expression) return;
      setResult(evaluateExpression(expression));
      return;
    }

    if (buttonText === '.') {
      const parts = expression.split(/[-+*/]/);
      const lastNumber = parts[parts.length - 1];
      if (lastNumber.includes('.')) {
        return;
      }
    }

    // Handle negative number at the start or after an operator
    const operators = ['+', '-', '*', '/'];
    const lastChar = expression.slice(-1);
    
    // Prevent consecutive operators (except for negative numbers)
    if (operators.includes(buttonText) && operators.includes(lastChar)) {
      // If trying to add operator after another operator, replace the last one
      // Exception: allow '-' after operator for negative numbers
      if (buttonText === '-' && operators.includes(lastChar)) {
        const newExpr = expression + '-';
        setExpression(newExpr);
        // Don't calculate result - wait for "=" button
        return;
      } else {
        // Replace last operator with new one
        const newExpr = expression.slice(0, -1) + buttonText;
        setExpression(newExpr);
        // Don't calculate result - wait for "=" button
        return;
      }
    }
    
    // Handle negative number at the start
    if (buttonText === '-' && expression.length === 0) {
      const newExpr = '-';
      setExpression(newExpr);
      // Don't change result - keep current result or "0"
      return;
    }

    // Handle negative number after operator
    if (buttonText === '-' && operators.includes(lastChar)) {
      const newExpr = expression + '-';
      setExpression(newExpr);
      // Don't calculate result - wait for "=" button
      return;
    }

    // Add the button text to expression
    const newExpr = expression + buttonText;
    setExpression(newExpr);
    // Don't calculate result - wait for "=" button
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
            value={expression || '0'}
            editable={false}
            placeholder="0"
          />
          <TextInput
            style={styles.resultField}
            value={result}
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

