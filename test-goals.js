import { saveGoal, getGoals } from './storage/goal';

// Test goal saving functionality
async function testGoalSaving() {
  console.log('Testing goal saving...');

  const testGoal = {
    id: 'test-goal-123',
    userId: 'default',
    title: 'Test Goal',
    description: 'This is a test goal',
    type: 'monthly' as const,
    year: 2025,
    month: 1,
    targetValue: 10,
    currentValue: 0,
    unit: 'books',
    linkedTaskIds: [],
    status: 'active' as const,
    progressType: 'manual' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    console.log('Saving test goal...');
    await saveGoal(testGoal);
    console.log('Goal saved successfully!');

    console.log('Retrieving goals...');
    const goals = await getGoals('default', 'monthly', 2025, undefined, 1);
    console.log('Retrieved goals:', goals);

    if (goals.length > 0 && goals.some(g => g.id === 'test-goal-123')) {
      console.log('✅ Goal saving and retrieval working correctly!');
    } else {
      console.log('❌ Goal was not found after saving');
    }
  } catch (error) {
    console.error('❌ Error testing goal saving:', error);
  }
}

testGoalSaving();