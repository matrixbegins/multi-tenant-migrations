// knexfile.js
require('dotenv').config();
const { readFileSync } = require('fs');
const { join } = require('path');

/**
 * Get SSL configuration for database connection
 * @returns {object|false} SSL config object or false if SSL is disabled
 */
function getSSLConfig() {
  const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

  if (!useSSL) {
    return false;
  }

  const sslCertPath = process.env.DB_SSL_CERT_PATH || process.env.SSL_CERT_PATH;
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' &&
                             process.env.DB_SSL_REJECT_UNAUTHORIZED !== '0';

  const sslConfig = {
    rejectUnauthorized: rejectUnauthorized,
  };

  // If SSL certificate path is provided, read and include it
  if (sslCertPath) {
    try {
      const certPath = sslCertPath.startsWith('/')
        ? sslCertPath
        : join(__dirname, sslCertPath);
      sslConfig.ca = readFileSync(certPath).toString();
    } catch (error) {
      console.warn(`Warning: Could not read SSL certificate from ${sslCertPath}:`, error.message);
      // Continue without CA certificate, but will use rejectUnauthorized setting
    }
  }

  return sslConfig;
}

/** @type {import('knex').Knex.Config} */
const config = {
    development: {
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'any_db',
        ssl: getSSLConfig()
      },
      debug: true,
      pool: { min: 2, max: 10 },
      // migrations default dir for master/public migrations
      migrations: {
        directory: './src/master/migrations',
        // extension 'js' (we are doing Knex JS migration files)
        extension: 'js',
        // tableName will be created in the current search_path for the connection
        tableName: 'knex_migrations'
      },
      // useful for multi-tenant if you want a default searchPath for master
      // searchPath: ['public']
    }
  };

module.exports = config;
