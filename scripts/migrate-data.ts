/**
 * Data Migration Script for Multi-User Support
 *
 * This script migrates all existing data to include userId="default"
 * for backward compatibility with the new multi-user architecture.
 *
 * Usage:
 * 1. From browser console (in development):
 *    - Open DevTools console
 *    - Copy and paste the migration command (see MIGRATION_PLAN.md)
 *
 * 2. Programmatically (from app):
 *    - Import and call runMigration() function
 *    - Best done in a settings/admin panel
 *
 * 3. Automatic (on app load):
 *    - Check migration status on startup
 *    - Run migration if needed
 */

import {
  migrateAllData,
  getMigrationStatus,
  initDB,
} from "@/storage";

/**
 * Main migration function
 * Safe to run multiple times - only migrates records without userId
 */
export async function runMigration(): Promise<void> {
  console.log("🔄 Starting data migration...");
  console.log("━".repeat(50));

  try {
    // Initialize database first
    await initDB();
    console.log("✓ Database initialized");

    // Check current status
    console.log("\n📊 Checking migration status...");
    const status = await getMigrationStatus();

    let totalNeedsMigration = 0;
    let totalRecords = 0;

    console.log("\nCurrent Status:");
    for (const [store, stats] of Object.entries(status)) {
      console.log(
        `  ${store}: ${stats.total} total, ${stats.needsMigration} need migration`
      );
      totalNeedsMigration += stats.needsMigration;
      totalRecords += stats.total;
    }

    if (totalNeedsMigration === 0) {
      console.log("\n✅ All records already migrated! No action needed.");
      console.log("━".repeat(50));
      return;
    }

    console.log(
      `\n⚠️  Found ${totalNeedsMigration} of ${totalRecords} records needing migration`
    );
    console.log("\n🔧 Running migration...");

    // Run migration
    const report = await migrateAllData();

    console.log("\n📋 Migration Results:");
    console.log("━".repeat(50));

    for (const result of report.results) {
      const status = result.migratedRecords > 0 ? "✓" : "○";
      console.log(
        `${status} ${result.store}: ${result.migratedRecords}/${result.totalRecords} migrated`
      );

      if (result.errors.length > 0) {
        console.log(`  ⚠️  Errors:`);
        result.errors.forEach((err) => console.log(`    - ${err}`));
      }
    }

    console.log("━".repeat(50));
    console.log(`\n✅ Migration Complete!`);
    console.log(`   Total records migrated: ${report.totalMigrated}`);
    console.log(`   Timestamp: ${report.timestamp}`);
    console.log("━".repeat(50));

    // Verify migration
    console.log("\n🔍 Verifying migration...");
    const verifyStatus = await getMigrationStatus();

    let stillNeedsMigration = 0;
    for (const stats of Object.values(verifyStatus)) {
      stillNeedsMigration += stats.needsMigration;
    }

    if (stillNeedsMigration === 0) {
      console.log("✅ Verification successful - all records migrated!");
    } else {
      console.log(
        `⚠️  Warning: ${stillNeedsMigration} records still need migration`
      );
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Check if migration is needed
 * Useful for showing migration prompts to users
 */
export async function checkMigrationNeeded(): Promise<boolean> {
  try {
    await initDB();
    const status = await getMigrationStatus();

    for (const stats of Object.values(status)) {
      if (stats.needsMigration > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Failed to check migration status:", error);
    return false;
  }
}

/**
 * Get detailed migration report without running migration
 */
export async function getMigrationReport(): Promise<{
  needsMigration: boolean;
  details: { [storeName: string]: { total: number; needsMigration: number } };
  totalRecords: number;
  totalNeedsMigration: number;
}> {
  try {
    await initDB();
    const status = await getMigrationStatus();

    let totalRecords = 0;
    let totalNeedsMigration = 0;

    for (const stats of Object.values(status)) {
      totalRecords += stats.total;
      totalNeedsMigration += stats.needsMigration;
    }

    return {
      needsMigration: totalNeedsMigration > 0,
      details: status,
      totalRecords,
      totalNeedsMigration,
    };
  } catch (error) {
    console.error("Failed to get migration report:", error);
    return {
      needsMigration: false,
      details: {},
      totalRecords: 0,
      totalNeedsMigration: 0,
    };
  }
}

// For browser console usage
if (typeof window !== "undefined") {
  (window as any).runDataMigration = runMigration;
  (window as any).checkMigrationStatus = getMigrationReport;
}
