// src/db.js

const Knex = require('knex');
const config = require('../knexfile.cjs');
const path = require('path');
const baseConfig = config.development;

// Note: SSL configuration (including certificate support) is handled in knexfile.cjs
// Set DB_SSL=true and DB_SSL_CERT_PATH=ssl/rds-ca-2019-root.pem (or absolute path) to enable SSL


/**
 * Create a knex instance scoped to a schema via searchPath.
 * Migration tables are created in the first element of searchPath.
 * @param {string} schema
 * @returns {import('knex')|Knex}
 */
function createKnexForMasterSchema() {
    return Knex({
      ...baseConfig,
      searchPath: ['public'],
      migrations: {
        directory: path.resolve('src/master/migrations'),
        tableName: 'knex_migrations_master'
      }
    });
}

/**
 * Knex instance for master/public tasks
 */
function createKnexForTenantSchema(schema) {
    return Knex({
      ...baseConfig,
      searchPath: [schema, 'public'],
      migrations: {
        directory: path.resolve('src/tenants/migrations'),
        tableName: 'knex_migrations_tenant'
      }
    });
  }

module.exports = {
  createKnexForTenantSchema,
  createKnexForMasterSchema,
  baseConfig
};

