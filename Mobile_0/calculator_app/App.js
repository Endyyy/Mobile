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
import { evaluate } from 'mathjs';

export default function App() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [lastOperation, setLastOperation] = useState(null);

  const { width } = Dimensions.get('window');
  const buttonSpacing = width * 0.02;
  const buttonSize = (width - (buttonSpacing * 5)) / 4;

  const evaluateExpression = (expr) => {
    try {
      if (!expr || expr.trim() === '') {
        return '0';
      }

      let sanitized = expr.replace(/\s/g, '');
      
      const operators = ['+', '*', '/'];
      const lastChar = sanitized[sanitized.length - 1];
      if (operators.includes(lastChar)) {
        sanitized = sanitized.slice(0, -1);
      }
      
      if (!sanitized || sanitized === '') {
        return '0';
      }

      const result = evaluate(sanitized);
      
      if (!isFinite(result) || isNaN(result)) {
        return 'Error';
      }
      
      return formatResult(result);
    } catch (e) {
      return 'Error';
    }
  };

  const formatResult = (result) => {
    const absResult = Math.abs(result);
    
    if (absResult > Number.MAX_SAFE_INTEGER) {
      try {
        const scientific = result.toExponential(10);
        const cleaned = scientific.replace(/\.?0+e/, 'e').replace(/e\+/, 'e');
        return cleaned;
      } catch (e) {
        try {
          const scientific = result.toExponential(5);
          return scientific.replace(/\.?0+e/, 'e').replace(/e\+/, 'e');
        } catch (e2) {
          return 'Error';
        }
      }
    }
    
    if (absResult >= 1e12 || (absResult < 1e-6 && absResult > 0)) {
      const scientific = result.toExponential(10);
      return scientific.replace(/\.?0+e/, 'e').replace(/e\+/, 'e');
    }

    let formatted = result.toString();
    
    if (formatted.length > 15 && formatted.includes('.')) {
      const scientific = result.toExponential(10);
      return scientific.replace(/\.?0+e/, 'e').replace(/e\+/, 'e');
    }
    
    if (formatted.includes('.')) {
      formatted = formatted.replace(/\.?0+$/, '');
    }
    
    return formatted;
  };

  const handleButtonPress = (buttonText) => {

    if (buttonText === 'AC') {
      setExpression('');
      setResult('0');
      setLastOperation(null);
      return;
    }

    if (buttonText === 'C') {
      if (expression.length === 0) {
        setResult('0');
        return;
      }
      const newExpr = expression.slice(0, -1);
      setExpression(newExpr);
      if (newExpr.length === 0) {
        setResult('0');
      }
      return;
    }

    if (buttonText === '=') {
      if (!expression) {
        if (lastOperation) {
          const newExpr = result + lastOperation.operator + lastOperation.value;
          const newResult = evaluateExpression(newExpr);
          setResult(newResult);
          setExpression(newExpr);
        }
        return;
      }
      
      const calculatedResult = evaluateExpression(expression);
      setResult(calculatedResult);
      
      const operators = ['+', '-', '*', '/'];
      let lastOp = null;
      let lastVal = null;
      
      for (let i = expression.length - 1; i >= 0; i--) {
        if (operators.includes(expression[i])) {
          if (expression[i] === '-' && i > 0 && operators.includes(expression[i - 1])) {
            continue;
          }
          lastOp = expression[i];
          lastVal = expression.substring(i + 1);
          break;
        }
      }
      
      if (lastOp && lastVal) {
        setLastOperation({ operator: lastOp, value: lastVal });
      } else {
        setLastOperation(null);
      }
      return;
    }

    if (buttonText === '.') {
      const operators = ['+', '-', '*', '/'];
      const lastChar = expression.slice(-1);
      
      if (expression.length === 0 || operators.includes(lastChar)) {
        const newExpr = expression + '0.';
        setExpression(newExpr);
        return;
      }
      
      const lastNumberMatch = expression.match(/([-]?\d*\.?\d*)$/);
      if (lastNumberMatch && lastNumberMatch[0].includes('.')) {
        return;
      }
      
      const newExpr = expression + '.';
      setExpression(newExpr);
      return;
    }

    const operators = ['+', '-', '*', '/'];
    const lastChar = expression.slice(-1);
    
    if (operators.includes(buttonText) && result !== '0' && expression === '') {
      const newExpr = result + buttonText;
      setExpression(newExpr);
      setLastOperation(null);
      return;
    }
    
    if (operators.includes(buttonText) && expression.length === 0) {
      if (buttonText === '-') {
        setExpression('-');
        return;
      } else {
        return;
      }
    }
    
    if (operators.includes(buttonText) && operators.includes(lastChar)) {
      if (buttonText === '-' && operators.includes(lastChar)) {
        const newExpr = expression + '-';
        setExpression(newExpr);
        setLastOperation(null);
        return;
      } else {
        const newExpr = expression.slice(0, -1) + buttonText;
        setExpression(newExpr);
        setLastOperation(null);
        return;
      }
    }
    
    if (buttonText === '-' && expression.length === 0) {
      setExpression('-');
      setLastOperation(null);
      return;
    }

    if (buttonText === '-' && operators.includes(lastChar)) {
      const newExpr = expression + '-';
      setExpression(newExpr);
      setLastOperation(null);
      return;
    }

    const newExpr = expression + buttonText;
    setExpression(newExpr);
    setLastOperation(null);
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

