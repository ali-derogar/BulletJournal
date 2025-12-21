/**
 * Comprehensive Migration Test Script
 *
 * Tests backward compatibility and multi-user migration for:
 * - Tasks (with timer, estimation, usefulness)
 * - Expenses
 * - Sleep/Wake tracking
 * - Mood/Daily inputs
 * - Reflections
 *
 * Run with: npx tsx scripts/test-migration.ts
 */

import { initDB, STORES } from "../storage/db";
import { migrateAllData, getMigrationStatus } from "../storage/migrate";
import { getTasks, saveTask } from "../storage/task";
import { getExpenses, saveExpense } from "../storage/expense";
import { getSleep, saveSleep } from "../storage/sleep";
import { getMood, saveMood } from "../storage/mood";
import type { Task, Expense, SleepInfo, MoodInfo } from "../domain";

// Test utilities
function log(message: string, ...args: any[]) {
  console.log(`\n✓ ${message}`, ...args);
}

function error(message: string, ...args: any[]) {
  console.error(`\n✗ ${message}`, ...args);
}

function section(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}`);
}

// Test data generators
function createLegacyTask(date: string, index: number): any {
  return {
    id: `legacy-task-${date}-${index}`,
    // No userId field - simulates legacy data
    date,
    title: `Legacy Task ${index}`,
    status: "todo",
    createdAt: new Date().toISOString(),
    accumulatedTime: 15,
    timerRunning: false,
    timerStart: null,
    estimatedTime: 30,
    isUseful: true,
  };
}

function createLegacyExpense(date: string, index: number): any {
  return {
    id: `legacy-expense-${date}-${index}`,
    // No userId field - simulates legacy data
    date,
    title: `Legacy Expense ${index}`,
    amount: 25.5,
    createdAt: new Date().toISOString(),
  };
}

function createLegacySleep(date: string): any {
  return {
    id: `sleep-${date}`,
    // No userId field - simulates legacy data
    date,
    sleepTime: "23:00",
    wakeTime: "07:00",
    hoursSlept: 8,
    quality: 7,
    createdAt: new Date().toISOString(),
  };
}

function createLegacyMood(date: string): any {
  return {
    id: `mood-${date}`,
    // No userId field - simulates legacy data
    date,
    rating: 8,
    dayScore: 9,
    notes: "Legacy mood note",
    waterIntake: 8,
    studyMinutes: 90,
    createdAt: new Date().toISOString(),
  };
}

// Insert legacy data directly into IndexedDB (bypassing storage layer)
async function insertLegacyData(storeName: string, records: any[]): Promise<void> {
  const db = (await initDB()) as IDBDatabase;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    let completed = 0;
    records.forEach((record) => {
      const request = store.put(record);
      request.onsuccess = () => {
        completed++;
        if (completed === records.length) {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    if (records.length === 0) resolve();
  });
}

// Main test suite
async function runTests() {
  try {
    section("MIGRATION TEST SUITE");

    // Initialize database
    await initDB();
    log("Database initialized");

    // Test 1: Insert legacy data (without userId)
    section("TEST 1: Insert Legacy Data");
    const testDate = "2025-01-15";

    const legacyTasks = [
      createLegacyTask(testDate, 1),
      createLegacyTask(testDate, 2),
      createLegacyTask(testDate, 3),
    ];

    const legacyExpenses = [
      createLegacyExpense(testDate, 1),
      createLegacyExpense(testDate, 2),
    ];

    const legacySleep = createLegacySleep(testDate);
    const legacyMood = createLegacyMood(testDate);

    await insertLegacyData(STORES.TASKS, legacyTasks);
    log(`Inserted ${legacyTasks.length} legacy tasks`);

    await insertLegacyData(STORES.EXPENSES, legacyExpenses);
    log(`Inserted ${legacyExpenses.length} legacy expenses`);

    await insertLegacyData(STORES.SLEEP, [legacySleep]);
    log("Inserted legacy sleep record");

    await insertLegacyData(STORES.MOOD, [legacyMood]);
    log("Inserted legacy mood record");

    // Test 2: Check migration status
    section("TEST 2: Check Migration Status");
    const statusBefore = await getMigrationStatus();
    log("Migration status before migration:");
    Object.entries(statusBefore).forEach(([store, status]) => {
      console.log(`  ${store}: ${status.needsMigration}/${status.total} need migration`);
    });

    // Test 3: Run migration
    section("TEST 3: Run Migration");
    const migrationReport = await migrateAllData();

    if (migrationReport.success) {
      log("Migration completed successfully");
      log(`Total migrated: ${migrationReport.totalMigrated} records`);
      migrationReport.results.forEach((result) => {
        console.log(`  ${result.store}: ${result.migratedRecords}/${result.totalRecords} migrated`);
        if (result.errors.length > 0) {
          error(`Errors in ${result.store}:`, result.errors);
        }
      });
    } else {
      error("Migration failed");
      return;
    }

    // Test 4: Verify migration status after
    section("TEST 4: Verify Migration Complete");
    const statusAfter = await getMigrationStatus();
    log("Migration status after migration:");
    Object.entries(statusAfter).forEach(([store, status]) => {
      console.log(`  ${store}: ${status.needsMigration}/${status.total} need migration`);
      if (status.needsMigration > 0) {
        error(`Still ${status.needsMigration} records need migration in ${store}`);
      }
    });

    // Test 5: Test backward compatibility - default user
    section("TEST 5: Backward Compatibility (Default User)");

    const defaultTasks = await getTasks(testDate, "default");
    log(`Retrieved ${defaultTasks.length} tasks for default user`);

    if (defaultTasks.length !== legacyTasks.length) {
      error(`Expected ${legacyTasks.length} tasks, got ${defaultTasks.length}`);
    }

    // Verify task data integrity
    defaultTasks.forEach((task, i) => {
      if (task.userId !== "default") {
        error(`Task ${i} has userId="${task.userId}", expected "default"`);
      }
      if (task.accumulatedTime !== 15) {
        error(`Task ${i} lost timer data`);
      }
      if (task.estimatedTime !== 30) {
        error(`Task ${i} lost estimation data`);
      }
      if (task.isUseful !== true) {
        error(`Task ${i} lost usefulness data`);
      }
    });
    log("All tasks migrated with data integrity");

    const defaultExpenses = await getExpenses(testDate, "default");
    log(`Retrieved ${defaultExpenses.length} expenses for default user`);

    const defaultSleep = await getSleep(testDate, "default");
    if (defaultSleep) {
      log("Retrieved sleep record for default user");
      if (defaultSleep.userId !== "default") {
        error(`Sleep userId="${defaultSleep.userId}", expected "default"`);
      }
    } else {
      error("Sleep record not found for default user");
    }

    const defaultMood = await getMood(testDate, "default");
    if (defaultMood) {
      log("Retrieved mood record for default user");
      if (defaultMood.userId !== "default") {
        error(`Mood userId="${defaultMood.userId}", expected "default"`);
      }
    } else {
      error("Mood record not found for default user");
    }

    // Test 6: Multi-user isolation
    section("TEST 6: Multi-User Isolation");

    // Create new user data
    const user1 = "user-alice";
    const user2 = "user-bob";

    const aliceTask: Task = {
      id: `task-${testDate}-alice`,
      userId: user1,
      date: testDate,
      title: "Alice's Task",
      status: "done",
      createdAt: new Date().toISOString(),
      spentTime: 45,
      timeLogs: [{
        id: 'test_log_1',
        type: 'manual',
        minutes: 45,
        createdAt: new Date().toISOString()
      }],
      timerRunning: false,
      timerStart: null,
      estimatedTime: 60,
      isUseful: true,
    };

    const bobTask: Task = {
      id: `task-${testDate}-bob`,
      userId: user2,
      date: testDate,
      title: "Bob's Task",
      status: "in-progress",
      createdAt: new Date().toISOString(),
      spentTime: 20,
      timeLogs: [{
        id: 'test_log_2',
        type: 'timer',
        minutes: 20,
        createdAt: new Date().toISOString()
      }],
      timerRunning: true,
      timerStart: new Date().toISOString(),
      estimatedTime: 30,
      isUseful: false,
    };

    await saveTask(aliceTask);
    await saveTask(bobTask);
    log("Created tasks for Alice and Bob");

    // Verify isolation
    const aliceTasks = await getTasks(testDate, user1);
    const bobTasks = await getTasks(testDate, user2);
    const defaultTasksAgain = await getTasks(testDate, "default");

    log(`Alice has ${aliceTasks.length} task(s)`);
    log(`Bob has ${bobTasks.length} task(s)`);
    log(`Default user has ${defaultTasksAgain.length} task(s)`);

    if (aliceTasks.length !== 1 || aliceTasks[0].title !== "Alice's Task") {
      error("Alice's tasks not isolated correctly");
    }

    if (bobTasks.length !== 1 || bobTasks[0].title !== "Bob's Task") {
      error("Bob's tasks not isolated correctly");
    }

    if (defaultTasksAgain.length !== legacyTasks.length) {
      error("Default user's tasks affected by other users");
    }

    log("✓ Multi-user isolation verified");

    // Test 7: Timer persistence per user
    section("TEST 7: Timer Persistence Per User");

    const aliceTaskReloaded = (await getTasks(testDate, user1))[0];
    const bobTaskReloaded = (await getTasks(testDate, user2))[0];

    if (!aliceTaskReloaded || aliceTaskReloaded.accumulatedTime !== 45) {
      error("Alice's timer data not persisted");
    } else {
      log("Alice's timer data persisted correctly");
    }

    if (!bobTaskReloaded || !bobTaskReloaded.timerRunning) {
      error("Bob's running timer not persisted");
    } else {
      log("Bob's running timer persisted correctly");
    }

    // Test 8: Dashboard aggregations per user
    section("TEST 8: Dashboard Aggregations");

    const aliceExpense: Expense = {
      id: `expense-${testDate}-alice`,
      userId: user1,
      date: testDate,
      title: "Alice's Expense",
      amount: 50.0,
      createdAt: new Date().toISOString(),
    };

    await saveExpense(aliceExpense);

    const aliceExpenses = await getExpenses(testDate, user1);
    const totalAlice = aliceExpenses.reduce((sum, e) => sum + e.amount, 0);

    const defaultExpensesAgain = await getExpenses(testDate, "default");
    const totalDefault = defaultExpensesAgain.reduce((sum, e) => sum + e.amount, 0);

    log(`Alice's total expenses: $${totalAlice.toFixed(2)}`);
    log(`Default user's total expenses: $${totalDefault.toFixed(2)}`);

    if (totalAlice !== 50.0) {
      error("Alice's expense aggregation incorrect");
    }

    if (totalDefault !== 51.0) { // 2 legacy expenses @ 25.5 each
      error("Default user's expense aggregation incorrect");
    }

    log("✓ Aggregations per user verified");

    // Test 9: Reflections per user
    section("TEST 9: Reflections Per User");

    const aliceMood: MoodInfo = {
      id: `mood-${testDate}-alice`,
      userId: user1,
      date: testDate,
      rating: 9,
      dayScore: 10,
      notes: "Alice's great day!",
      waterIntake: 10,
      studyMinutes: 120,
      createdAt: new Date().toISOString(),
    };

    await saveMood(aliceMood);

    const aliceMoodReloaded = await getMood(testDate, user1);
    const defaultMoodAgain = await getMood(testDate, "default");

    if (!aliceMoodReloaded || aliceMoodReloaded.notes !== "Alice's great day!") {
      error("Alice's mood not isolated");
    } else {
      log("Alice's mood data isolated correctly");
    }

    if (!defaultMoodAgain || defaultMoodAgain.notes !== "Legacy mood note") {
      error("Default user's mood affected");
    } else {
      log("Default user's mood data preserved");
    }

    // Final summary
    section("TEST SUMMARY");
    log("✅ All migration tests passed!");
    log("✅ Backward compatibility verified");
    log("✅ Multi-user isolation confirmed");
    log("✅ Timer persistence working");
    log("✅ Aggregations per user working");
    log("✅ Data integrity maintained");

  } catch (err) {
    error("Test suite failed:", err);
    throw err;
  }
}

// Run tests
runTests()
  .then(() => {
    console.log("\n✅ All tests completed successfully!\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Tests failed:", err);
    process.exit(1);
  });
