// src/migrateMaster.js

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });


const { createKnexForMasterSchema } = require('./db');

async function migrateMaster({ dryRun } = { dryRun: false }) {
  const knex = createKnexForMasterSchema();
  try {
    console.log('Running master migrations (public schema)...');
    if (dryRun) {
      console.log('Dry run requested. Listing migrations to run is not directly available programmatically from knex; create a test DB or run CLI with --dry-run pattern.');
    }
    const [batchNo, log] = await knex.migrate.latest();
    console.log(`✅ Master migrations finished.`);
    console.log(`📦 Batch ${batchNo} applied:`);
    if (log.length === 0) {
      console.log('No new migrations.');
    } else {
      log.forEach(file => console.log(`   - ${file}`));
    }
  } catch (err) {
    console.error('❌ Master migration failed:', err);
    throw err;
  } finally {
    await knex.destroy();
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry');
  migrateMaster({ dryRun: dry }).catch(() => process.exit(1));
}

module.exports = migrateMaster;
