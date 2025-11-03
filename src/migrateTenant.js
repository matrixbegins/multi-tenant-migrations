// src/migrateTenant.js

const { createKnexForMasterSchema, createKnexForTenantSchema } = require('./db');

async function migrateTenants() {
  const masterKnex = createKnexForMasterSchema();
  try {
    const tenants = await masterKnex('tenants').select('schema_name');

    for (const tenant of tenants) {
      const schema = tenant.schema_name;
      console.log(`➡️ Migrating tenant: ${schema}`);
      const tenantKnex = createKnexForTenantSchema(schema);
      try {
        await tenantKnex.migrate.latest();
        console.log(`✅ Tenant ${schema} schema up-to-date`);
      } finally {
        await tenantKnex.destroy();
      }
    }
  } catch (err) {
    console.error('❌ Tenant migration error:', err);
  } finally {
    await masterKnex.destroy();
  }
}

migrateTenants();

