export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi } */) {
    // Register phase
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    // Create database indexes if they don't exist
    // This is a fallback for when migrations don't run automatically
    try {
      const knex = strapi.db.connection;

      // Check if we're using PostgreSQL
      const client = knex.client.config.client;
      if (client === 'postgres' || client === 'pg') {
        await createIndexesSafely(knex);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      strapi.log.warn('Could not create indexes:', errorMessage);
    }
  },
};

interface IndexConfig {
  table: string;
  column: string | string[];
  name: string;
}

/**
 * Safely create indexes, ignoring errors if they already exist
 */
async function createIndexesSafely(knex: any) {
  const indexes: IndexConfig[] = [
    {
      table: 'grievance_cases',
      column: 'case_no',
      name: 'idx_grievance_cases_case_no',
    },
    {
      table: 'certifications',
      column: 'expiry_date',
      name: 'idx_certifications_expiry_date',
    },
    {
      table: 'licenses',
      column: 'expiry_date',
      name: 'idx_licenses_expiry_date',
    },
    {
      table: 'grievance_cases',
      column: 'status',
      name: 'idx_grievance_cases_status',
    },
    {
      table: 'documents',
      column: 'type',
      name: 'idx_documents_type',
    },
    {
      table: 'documents',
      column: 'is_public',
      name: 'idx_documents_is_public',
    },
  ];

  for (const idx of indexes) {
    try {
      // Check if table exists first
      const tableExists = await knex.schema.hasTable(idx.table);
      if (!tableExists) continue;

      // Check if index exists using pg_indexes
      const indexExists = await knex.raw(`
        SELECT 1 FROM pg_indexes 
        WHERE tablename = ? AND indexname = ?
      `, [idx.table, idx.name]);

      if (indexExists.rows.length === 0) {
        await knex.schema.alterTable(idx.table, (table: any) => {
          if (Array.isArray(idx.column)) {
            table.index(idx.column, idx.name);
          } else {
            table.index(idx.column, idx.name);
          }
        });
        console.log(`✅ Created index: ${idx.name}`);
      }
    } catch {
      // Index might already exist or table not yet created
      // This is fine - Strapi will create tables on first access
    }
  }
}
