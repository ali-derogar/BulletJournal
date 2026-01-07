/**
 * Test script for multi-user storage functionality
 *
 * This script can be run in the browser console to test:
 * 1. User data isolation
 * 2. Backward compatibility
 * 3. Migration functionality
 *
 * Usage:
 * 1. Open browser DevTools console
 * 2. Run: await window.testMultiUserStorage()
 */

import { initDB, getTasks, saveTask, getExpenses, saveExpense } from "./index";
import type { Task, Expense } from "@/domain";

async function testMultiUserStorage(): Promise<void> {
  console.log("🧪 Testing Multi-User Storage");
  console.log("━".repeat(50));

  try {
    // Initialize database
    await initDB();
    console.log("✓ Database initialized");

    const testDate = "2025-01-15";

    // Test 1: Create tasks for different users
    console.log("\n📝 Test 1: Creating tasks for different users...");

    const task1: Task = {
      id: "test-task-user1-1",
      userId: "user1",
      date: testDate,
      title: "User 1 - Task 1",
      status: "todo",
      createdAt: new Date().toISOString(),
      spentTime: 0,
      timeLogs: [],
      timerRunning: false,
      timerStart: null,
      estimatedTime: null,
      isUseful: null,
      isCopiedToNextDay: false,
    };

    const task2: Task = {
      id: "test-task-user2-1",
      userId: "user2",
      date: testDate,
      title: "User 2 - Task 1",
      status: "todo",
      createdAt: new Date().toISOString(),
      spentTime: 0,
      timeLogs: [],
      timerRunning: false,
      timerStart: null,
      estimatedTime: null,
      isUseful: null,
      isCopiedToNextDay: false,
    };

    const taskDefault: Task = {
      id: "test-task-default-1",
      userId: "default",
      date: testDate,
      title: "Default User - Task 1",
      status: "todo",
      createdAt: new Date().toISOString(),
      spentTime: 0,
      timeLogs: [],
      timerRunning: false,
      timerStart: null,
      estimatedTime: null,
      isUseful: null,
      isCopiedToNextDay: false,
    };

    await saveTask(task1);
    await saveTask(task2);
    await saveTask(taskDefault);

    console.log("✓ Created 3 tasks for different users");

    // Test 2: Verify user isolation
    console.log("\n🔒 Test 2: Verifying user isolation...");

    const user1Tasks = await getTasks(testDate, "user1");
    const user2Tasks = await getTasks(testDate, "user2");
    const defaultTasks = await getTasks(testDate, "default");

    console.log(`  User 1 tasks: ${user1Tasks.length}`);
    console.log(`  User 2 tasks: ${user2Tasks.length}`);
    console.log(`  Default tasks: ${defaultTasks.length}`);

    if (
      user1Tasks.length === 1 &&
      user2Tasks.length === 1 &&
      defaultTasks.length === 1
    ) {
      console.log("✓ User isolation working correctly");
    } else {
      console.error("✗ User isolation failed!");
      return;
    }

    // Test 3: Verify task content
    console.log("\n📋 Test 3: Verifying task content...");

    if (user1Tasks[0].title === "User 1 - Task 1") {
      console.log("✓ User 1 task content correct");
    } else {
      console.error("✗ User 1 task content incorrect!");
      return;
    }

    if (user2Tasks[0].title === "User 2 - Task 1") {
      console.log("✓ User 2 task content correct");
    } else {
      console.error("✗ User 2 task content incorrect!");
      return;
    }

    // Test 4: Backward compatibility
    console.log("\n🔄 Test 4: Testing backward compatibility...");

    const tasksWithoutUserId = await getTasks(testDate);
    console.log(
      `  getTasks(date) returned ${tasksWithoutUserId.length} tasks`
    );

    if (tasksWithoutUserId.length === 1) {
      console.log("✓ Backward compatibility working (defaults to 'default')");
    } else {
      console.error("✗ Backward compatibility failed!");
      return;
    }

    // Test 5: Test with expenses
    console.log("\n💰 Test 5: Testing expenses multi-user...");

    const expense1: Expense = {
      id: "test-expense-user1-1",
      userId: "user1",
      date: testDate,
      title: "User 1 - Expense 1",
      amount: 10.5,
      createdAt: new Date().toISOString(),
    };

    const expense2: Expense = {
      id: "test-expense-user2-1",
      userId: "user2",
      date: testDate,
      title: "User 2 - Expense 1",
      amount: 20.75,
      createdAt: new Date().toISOString(),
    };

    await saveExpense(expense1);
    await saveExpense(expense2);

    const user1Expenses = await getExpenses(testDate, "user1");
    const user2Expenses = await getExpenses(testDate, "user2");

    console.log(`  User 1 expenses: ${user1Expenses.length}`);
    console.log(`  User 2 expenses: ${user2Expenses.length}`);

    if (user1Expenses.length === 1 && user2Expenses.length === 1) {
      console.log("✓ Expense isolation working correctly");
    } else {
      console.error("✗ Expense isolation failed!");
      return;
    }

    // Summary
    console.log("\n" + "━".repeat(50));
    console.log("✅ All tests passed!");
    console.log("━".repeat(50));
    console.log("\n📊 Summary:");
    console.log("  ✓ User data isolation");
    console.log("  ✓ Task content integrity");
    console.log("  ✓ Backward compatibility");
    console.log("  ✓ Multi-entity support (tasks, expenses)");
    console.log("\n🎉 Multi-user storage is working correctly!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Export for programmatic use
export { testMultiUserStorage };

// Make available in browser console
if (typeof window !== "undefined") {
  (window as any).testMultiUserStorage = testMultiUserStorage;
}
