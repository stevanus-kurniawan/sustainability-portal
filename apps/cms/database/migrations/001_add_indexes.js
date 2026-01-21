/**
 * Migration: Add indexes for frequently queried fields
 * 
 * This migration adds database indexes for performance optimization.
 * 
 * Note: This migration is designed to be safe to run on first startup
 * when tables may not exist yet. Indexes will be created by the bootstrap
 * function in src/index.ts after tables are created.
 */

'use strict';

async function up(knex) {
  // On first run, tables don't exist yet - Strapi creates them after migrations
  // We'll create indexes via bootstrap in src/index.ts instead
  // This migration is here for documentation and can be used for manual runs

  const indexes = [
    { table: 'grievance_cases', column: 'case_no', name: 'idx_grievance_cases_case_no' },
    { table: 'grievance_cases', column: 'status', name: 'idx_grievance_cases_status' },
    { table: 'certifications', column: 'expiry_date', name: 'idx_certifications_expiry_date' },
    { table: 'certifications', column: ['status', 'expiry_date'], name: 'idx_certifications_status_expiry' },
    { table: 'licenses', column: 'expiry_date', name: 'idx_licenses_expiry_date' },
    { table: 'licenses', column: ['status', 'expiry_date'], name: 'idx_licenses_status_expiry' },
    { table: 'documents', column: 'type', name: 'idx_documents_type' },
    { table: 'documents', column: 'is_public', name: 'idx_documents_is_public' },
  ];

  for (const idx of indexes) {
    try {
      // Check if table exists
      const tableExists = await knex.schema.hasTable(idx.table);
      if (!tableExists) {
        console.log(`⏭️ Skipping index ${idx.name} - table ${idx.table} doesn't exist yet`);
        continue;
      }

      // Check if index already exists
      const indexExists = await knex.raw(`
        SELECT 1 FROM pg_indexes 
        WHERE tablename = ? AND indexname = ?
      `, [idx.table, idx.name]);

      if (indexExists.rows && indexExists.rows.length > 0) {
        console.log(`⏭️ Skipping index ${idx.name} - already exists`);
        continue;
      }

      // Create the index
      await knex.schema.alterTable(idx.table, (table) => {
        table.index(idx.column, idx.name);
      });
      console.log(`✅ Created index: ${idx.name}`);
    } catch (error) {
      console.log(`⚠️ Could not create index ${idx.name}: ${error.message}`);
      // Continue with other indexes
    }
  }
}

async function down(knex) {
  const indexes = [
    { table: 'documents', name: 'idx_documents_is_public' },
    { table: 'documents', name: 'idx_documents_type' },
    { table: 'licenses', name: 'idx_licenses_status_expiry' },
    { table: 'licenses', name: 'idx_licenses_expiry_date' },
    { table: 'certifications', name: 'idx_certifications_status_expiry' },
    { table: 'certifications', name: 'idx_certifications_expiry_date' },
    { table: 'grievance_cases', name: 'idx_grievance_cases_status' },
    { table: 'grievance_cases', name: 'idx_grievance_cases_case_no' },
  ];

  for (const idx of indexes) {
    try {
      const tableExists = await knex.schema.hasTable(idx.table);
      if (!tableExists) continue;

      await knex.raw(`DROP INDEX IF EXISTS ${idx.name}`);
      console.log(`✅ Dropped index: ${idx.name}`);
    } catch (error) {
      console.log(`⚠️ Could not drop index ${idx.name}: ${error.message}`);
    }
  }
}

module.exports = { up, down };
