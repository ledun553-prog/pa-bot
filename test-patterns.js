#!/usr/bin/env node

/**
 * Test Pattern Detection - 100% Price Action
 * Validates that all candlestick patterns can be detected
 */

const {
  detectPinBar,
  detectEngulfing,
  detectHarami,
  detectInsideBar,
  detectMorningStar,
  detectEveningStar,
  detectTweezer,
  detectDoji,
  detectThreeWhiteSoldiers,
  detectThreeBlackCrows,
  detectReversalPattern
} = require('./src/pa/patterns');

console.log('='.repeat(60));
console.log('PA-Bot Pattern Detection Tests - 100% Price Action');
console.log('='.repeat(60));
console.log();

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ ${name}`);
    passedTests++;
    return true;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: Bullish Pin Bar (Hammer)
test('Detect Bullish Pin Bar (Hammer)', () => {
  const candle = {
    open: 100,
    high: 102,
    low: 95,
    close: 101,
    volume: 1000
  };
  
  const result = detectPinBar(candle);
  assert(result.isPinBar, 'Should detect pin bar');
  assert(result.type === 'bullish', 'Should be bullish');
  assert(result.name === 'Hammer', 'Should be named Hammer');
  assert(result.strength > 0, 'Should have strength > 0');
});

// Test 2: Bearish Pin Bar (Shooting Star)
test('Detect Bearish Pin Bar (Shooting Star)', () => {
  const candle = {
    open: 100,
    high: 107,
    low: 99,
    close: 100.5,
    volume: 1000
  };
  
  const result = detectPinBar(candle);
  assert(result.isPinBar, 'Should detect pin bar');
  assert(result.type === 'bearish', 'Should be bearish');
  assert(result.name === 'Shooting Star', 'Should be named Shooting Star');
});

// Test 3: Bullish Engulfing
test('Detect Bullish Engulfing', () => {
  const prevCandle = {
    open: 102,
    high: 103,
    low: 99,
    close: 100,
    volume: 1000
  };
  
  const currentCandle = {
    open: 99,
    high: 105,
    low: 98,
    close: 104,
    volume: 1500
  };
  
  const result = detectEngulfing(prevCandle, currentCandle);
  assert(result.isEngulfing, 'Should detect engulfing');
  assert(result.type === 'bullish', 'Should be bullish');
  assert(result.name === 'Bullish Engulfing', 'Should be named Bullish Engulfing');
});

// Test 4: Bearish Engulfing
test('Detect Bearish Engulfing', () => {
  const prevCandle = {
    open: 100,
    high: 105,
    low: 99,
    close: 104,
    volume: 1000
  };
  
  const currentCandle = {
    open: 105,
    high: 106,
    low: 97,
    close: 98,
    volume: 1500
  };
  
  const result = detectEngulfing(prevCandle, currentCandle);
  assert(result.isEngulfing, 'Should detect engulfing');
  assert(result.type === 'bearish', 'Should be bearish');
});

// Test 5: Bullish Harami
test('Detect Bullish Harami', () => {
  const prevCandle = {
    open: 105,
    high: 106,
    low: 95,
    close: 96,
    volume: 1000
  };
  
  const currentCandle = {
    open: 99,
    high: 101,
    low: 98,
    close: 100,
    volume: 800
  };
  
  const result = detectHarami(prevCandle, currentCandle);
  assert(result.isHarami, 'Should detect Harami');
  assert(result.type === 'bullish', 'Should be bullish');
  assert(result.name === 'Bullish Harami', 'Should be named Bullish Harami');
});

// Test 6: Bearish Harami
test('Detect Bearish Harami', () => {
  const prevCandle = {
    open: 95,
    high: 105,
    low: 94,
    close: 104,
    volume: 1000
  };
  
  const currentCandle = {
    open: 101,
    high: 102,
    low: 99,
    close: 100,
    volume: 800
  };
  
  const result = detectHarami(prevCandle, currentCandle);
  assert(result.isHarami, 'Should detect Harami');
  assert(result.type === 'bearish', 'Should be bearish');
  assert(result.name === 'Bearish Harami', 'Should be named Bearish Harami');
});

// Test 7: Inside Bar
test('Detect Inside Bar', () => {
  const prevCandle = {
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 1000
  };
  
  const currentCandle = {
    open: 102,
    high: 107,
    low: 95,
    close: 103,
    volume: 800
  };
  
  const result = detectInsideBar(prevCandle, currentCandle);
  assert(result.isInsideBar, 'Should detect inside bar');
  assert(result.type === 'neutral', 'Should be neutral');
});

// Test 8: Morning Star
test('Detect Morning Star', () => {
  const candles = [
    { open: 105, high: 106, low: 95, close: 96, volume: 1000 },  // Bearish
    { open: 96, high: 97, low: 94, close: 95, volume: 500 },     // Small star
    { open: 95, high: 105, low: 94, close: 104, volume: 1200 }   // Bullish
  ];
  
  const result = detectMorningStar(candles);
  assert(result.isMorningStar, 'Should detect morning star');
  assert(result.type === 'bullish', 'Should be bullish');
  assert(result.name === 'Morning Star', 'Should be named Morning Star');
});

// Test 9: Evening Star
test('Detect Evening Star', () => {
  const candles = [
    { open: 95, high: 105, low: 94, close: 104, volume: 1000 },  // Bullish
    { open: 104, high: 106, low: 103, close: 105, volume: 500 }, // Small star
    { open: 105, high: 106, low: 96, close: 97, volume: 1200 }   // Bearish
  ];
  
  const result = detectEveningStar(candles);
  assert(result.isEveningStar, 'Should detect evening star');
  assert(result.type === 'bearish', 'Should be bearish');
  assert(result.name === 'Evening Star', 'Should be named Evening Star');
});

// Test 10: Three White Soldiers
test('Detect Three White Soldiers', () => {
  const candles = [
    { open: 95, high: 100, low: 94, close: 99, volume: 1000 },
    { open: 98, high: 104, low: 97, close: 103, volume: 1000 },
    { open: 102, high: 108, low: 101, close: 107, volume: 1000 }
  ];
  
  const result = detectThreeWhiteSoldiers(candles);
  assert(result.isThreeWhiteSoldiers, 'Should detect three white soldiers');
  assert(result.type === 'bullish', 'Should be bullish');
  assert(result.name === 'Three White Soldiers', 'Should be named Three White Soldiers');
});

// Test 11: Three Black Crows
test('Detect Three Black Crows', () => {
  const candles = [
    { open: 107, high: 108, low: 101, close: 102, volume: 1000 },
    { open: 103, high: 104, low: 97, close: 98, volume: 1000 },
    { open: 99, high: 100, low: 93, close: 94, volume: 1000 }
  ];
  
  const result = detectThreeBlackCrows(candles);
  assert(result.isThreeBlackCrows, 'Should detect three black crows');
  assert(result.type === 'bearish', 'Should be bearish');
  assert(result.name === 'Three Black Crows', 'Should be named Three Black Crows');
});

// Test 12: Tweezer Bottom
test('Detect Tweezer Bottom', () => {
  const prevCandle = {
    open: 102,
    high: 103,
    low: 95.00,
    close: 96,
    volume: 1000
  };
  
  const currentCandle = {
    open: 96,
    high: 102,
    low: 95.01,  // Very close to previous low
    close: 101,
    volume: 1200
  };
  
  const result = detectTweezer(prevCandle, currentCandle);
  assert(result.isTweezer, 'Should detect tweezer');
  assert(result.type === 'bullish', 'Should be bullish');
  assert(result.name === 'Tweezer Bottom', 'Should be named Tweezer Bottom');
});

// Test 13: Tweezer Top
test('Detect Tweezer Top', () => {
  const prevCandle = {
    open: 95,
    high: 105.00,
    low: 94,
    close: 104,
    volume: 1000
  };
  
  const currentCandle = {
    open: 104,
    high: 105.01,  // Very close to previous high
    low: 98,
    close: 99,
    volume: 1200
  };
  
  const result = detectTweezer(prevCandle, currentCandle);
  assert(result.isTweezer, 'Should detect tweezer');
  assert(result.type === 'bearish', 'Should be bearish');
  assert(result.name === 'Tweezer Top', 'Should be named Tweezer Top');
});

// Test 14: Doji
test('Detect Doji', () => {
  const candle = {
    open: 100.00,
    high: 102,
    low: 98,
    close: 100.10,  // Very close to open
    volume: 1000
  };
  
  const result = detectDoji(candle);
  assert(result.isDoji, 'Should detect doji');
  assert(result.type === 'neutral', 'Should be neutral');
  assert(result.name === 'Doji', 'Should be named Doji');
});

// Test 15: Reversal Pattern Detection (Integration)
test('Detect Reversal Pattern with Configuration', () => {
  const candles = [
    { open: 105, high: 106, low: 95, close: 96, volume: 1000 },
    { open: 96, high: 97, low: 94, close: 95, volume: 500 },
    { open: 95, high: 105, low: 94, close: 104, volume: 1200 }
  ];
  
  const config = {
    enabledPatterns: {
      morningStar: true,
      eveningStar: true,
      threeWhiteSoldiers: true,
      threeBlackCrows: true
    }
  };
  
  const result = detectReversalPattern(candles, config);
  assert(result !== null, 'Should detect a pattern');
  assert(result.isMorningStar === true, 'Should detect morning star');
});

// Test 16: Pattern Detection with Disabled Patterns
test('Pattern Detection Respects Disabled Patterns', () => {
  const candles = [
    { open: 105, high: 106, low: 95, close: 96, volume: 1000 },
    { open: 96, high: 97, low: 94, close: 95, volume: 500 },
    { open: 95, high: 105, low: 94, close: 104, volume: 1200 }
  ];
  
  const config = {
    enabledPatterns: {
      morningStar: false,  // Disabled
      pinBar: true
    }
  };
  
  const result = detectReversalPattern(candles, config);
  // Should not detect morning star since it's disabled
  assert(result === null || result.name !== 'Morning Star', 'Should not detect disabled pattern');
});

console.log();
console.log('='.repeat(60));
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log('='.repeat(60));

if (passedTests === totalTests) {
  console.log('✓ All pattern detection tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed');
  process.exit(1);
}
