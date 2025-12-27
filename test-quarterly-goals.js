// Test script to verify quarterly goal functionality
import { getCurrentPeriod, validateGoal } from './utils/goalUtils.ts';

console.log('=== Testing Quarterly Goal Functionality ===\n');

// Test 1: Get current period for quarterly
console.log('Test 1: Get current period for quarterly');
const quarterlyPeriod = getCurrentPeriod('quarterly');
console.log('Current quarterly period:', quarterlyPeriod);
console.log('Expected: year and quarter should be set');
console.log('✓ Quarter:', quarterlyPeriod.quarter, '(should be 1-4)');
console.log('✓ Year:', quarterlyPeriod.year);
console.log('');

// Test 2: Validate a complete quarterly goal
console.log('Test 2: Validate a complete quarterly goal');
const completeQuarterlyGoal = {
  title: 'Complete 3 projects',
  type: 'quarterly',
  year: 2025,
  quarter: 4,
  targetValue: 3,
  unit: 'projects',
  status: 'active',
  progressType: 'manual',
};
const errors1 = validateGoal(completeQuarterlyGoal);
console.log('Validation errors:', errors1.length === 0 ? 'None (✓ Valid)' : errors1);
console.log('');

// Test 3: Validate quarterly goal without quarter field
console.log('Test 3: Validate quarterly goal WITHOUT quarter field');
const incompleteQuarterlyGoal = {
  title: 'Complete 3 projects',
  type: 'quarterly',
  year: 2025,
  // quarter is missing!
  targetValue: 3,
  unit: 'projects',
  status: 'active',
  progressType: 'manual',
};
const errors2 = validateGoal(incompleteQuarterlyGoal);
console.log('Validation errors:', errors2.length > 0 ? `${errors2.length} error(s) - ${errors2.join(', ')}` : 'None');
console.log('Expected: Should have error about missing quarter');
console.log('');

// Test 4: Validate monthly goal
console.log('Test 4: Validate a complete monthly goal');
const monthlyGoal = {
  title: 'Read 10 books',
  type: 'monthly',
  year: 2025,
  month: 12,
  targetValue: 10,
  unit: 'books',
  status: 'active',
  progressType: 'manual',
};
const errors3 = validateGoal(monthlyGoal);
console.log('Validation errors:', errors3.length === 0 ? 'None (✓ Valid)' : errors3);
console.log('');

console.log('=== All Tests Complete ===');
