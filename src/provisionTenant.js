// src/provisionTenant.js

require('dotenv').config();
const { createKnexForMasterSchema, createKnexForTenantSchema } = require('./db');
const { generateSchemaName } = require('./utils');

async function ensureSchema(knex, schema) {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
}

async function ensureExtensions(knex) {
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;`).catch((err) => {
    if (!/already exists/i.test(err.message)) throw err;
  });
}

async function upsertTenant(masterKnex, clerkOrgId, schema) {
  const now = new Date();
  await masterKnex('tenants')
    .insert({
      clerk_org_id: clerkOrgId,
      schema_name: schema,
      status: 'PROVISIONING',
      started_at: now,
    })
    .onConflict('clerk_org_id')
    .merge({
      schema_name: schema,
      status: 'PROVISIONING',
      started_at: now,
      activated_at: null,
      failed_at: null,
      error_message: null,
    });
}

async function markTenant(masterKnex, clerkOrgId, status, error = null) {
  const update = { status, updated_at: new Date() };
  if (status === 'ACTIVE') update.activated_at = new Date();
  if (status === 'FAILED') {
    update.failed_at = new Date();
    update.error_message = String(error).substring(0, 2000);
  }
  await masterKnex('tenants').where({ clerk_org_id: clerkOrgId }).update(update);
}

async function provisionTenant(clerkOrgId) {
  if (!clerkOrgId) throw new Error('clerkOrgId is required');

  const schema = generateSchemaName(clerkOrgId);
  const masterKnex = createKnexForMasterSchema();

  try {
    await upsertTenant(masterKnex, clerkOrgId, schema);
    console.log(`Tenant [${clerkOrgId}] → PROVISIONING`);
    await ensureSchema(masterKnex, schema);
    await ensureExtensions(masterKnex);

    const tenantKnex = createKnexForTenantSchema(schema);
    try {
      await tenantKnex.migrate.latest();
      await markTenant(masterKnex, clerkOrgId, 'ACTIVE');
      console.log(`Tenant [${clerkOrgId}] → ACTIVE`);
    } catch (err) {
      console.error(`Migration failed for ${schema}:`, err);
      await markTenant(masterKnex, clerkOrgId, 'FAILED', err);
      await tenantKnex.migrate.rollback(); // best-effort rollback
      throw err;
    } finally {
      await tenantKnex.destroy();
    }
  } finally {
    await masterKnex.destroy();
  }
}

// CLI entrypoint
if (require.main === module) {
  const clerkOrgId = process.argv[2];
  provisionTenant(clerkOrgId).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
