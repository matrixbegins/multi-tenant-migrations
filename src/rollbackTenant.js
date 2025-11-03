// src/rollbackTenant.js

const { createKnexForMasterSchema, createKnexForTenantSchema } = require('./db');

async function rollbackTenants() {
  const masterKnex = createKnexForMasterSchema();
  try {
    const tenants = await masterKnex('tenants').select('schema_name');

    for (const tenant of tenants) {
      const schema = tenant.schema_name;
      console.log(`↩️ Rolling back tenant schema: ${schema}`);
      const tenantKnex = createKnexForTenantSchema(schema);
      try {
        const [batchNo, log] = await tenantKnex.migrate.rollback();
        if (log.length === 0) {
          console.log(`✅ No migrations to rollback for ${schema}`);
        } else {
          console.log(`✅ Rolled back batch ${batchNo} for ${schema}:`, log);
        }
      } finally {
        await tenantKnex.destroy();
      }
    }
  } catch (err) {
    console.error('❌ Tenant rollback error:', err);
  } finally {
    await masterKnex.destroy();
  }
}

rollbackTenants();
