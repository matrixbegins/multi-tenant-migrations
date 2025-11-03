// src/rollbackMaster.js

const { createKnexForMasterSchema } = require('./db');

async function rollbackMaster() {
  const knex = createKnexForMasterSchema();
  try {
    console.log('↩️ Rolling back last master migration batch...');
    const [batchNo, log] = await knex.migrate.rollback();
    if (log.length === 0) {
      console.log('✅ Nothing to rollback for master schema');
    } else {
      console.log(`✅ Rolled back batch ${batchNo}:`, log);
    }
  } catch (err) {
    console.error('❌ Master rollback failed:', err);
  } finally {
    await knex.destroy();
  }
}

rollbackMaster();
