# Multi-Tenant Database Migrations

Database migration system for multi-tenant PostgreSQL application using Knex.js with schema-per-tenant architecture.

## Prerequisites

- **Node.js**: Version 22 or higher (use `nvm use 22` before running commands)
- **PostgreSQL**: Version 12 or higher
- **pnpm**: Package manager (version 10.18.2)

## Database Setup

### 1. Create Database User

```sql
CREATE USER dev_user WITH PASSWORD 'dev_pass123';
```

### 2. Create Database

```sql
CREATE DATABASE my_db;
GRANT ALL PRIVILEGES ON DATABASE my_db TO dev_user;
```

### 3. Set Schema Ownership

```sql
\c my_db
ALTER SCHEMA public OWNER TO dev_user;
```

### 4. Install Extensions (Optional)

If you need the pgvector extension for vector embeddings:

```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
```

## Application Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=dev_user
DB_PASSWORD=dev_pass123
DB_NAME=my_db

# SSL Configuration (for local development, set to false)
DB_SSL=false

# For production/staging with RDS:
# DB_SSL=true
# DB_SSL_CERT_PATH=ssl/rds-ca-2019-root.pem
# DB_SSL_REJECT_UNAUTHORIZED=true
```

### 3. Run Master Migrations

This creates the `tenants` table and other public schema tables:

```bash
pnpm migrate:master
```

### 4. Provision a Tenant

Provision a new tenant schema for a Clerk organization:

```bash
pnpm provision:tenant <clerk_org_id>
```

Example:
```bash
pnpm provision:tenant org_2abc123def456
```

## Available Commands

### Migration Management

- **Create migration files:**
  ```bash
  # Master schema migration
  pnpm migrate:make:master <migration_name>

  # Tenant schema migration
  pnpm migrate:make:tenant <migration_name>
  ```

- **Run migrations:**
  ```bash
  # Master schema (public)
  pnpm migrate:master

  # All tenant schemas
  pnpm migrate:tenants
  ```

- **Rollback migrations:**
  ```bash
  # Master schema
  pnpm rollback:master

  # All tenant schemas
  pnpm rollback:tenants
  ```

## Project Structure

```
src/
├── db.js                    # Knex connection factory
├── master/
│   └── migrations/          # Public schema migrations
│       ├── init_db.js       # tenants table
│       ├── focus_area_table.js
│       └── categories_table.js
├── tenants/
│   └── migrations/          # Tenant schema migrations
│       ├── tenant_init_db.js # chat_messages (with vector)
│       ├── org_users_table.js
│       └── org_settings_table.js
├── migrateMaster.js         # Master migration runner
├── migrateTenant.js         # Tenant migration runner
├── provisionTenant.js      # Tenant provisioning
├── rollbackMaster.js        # Master rollback
└── rollbackTenant.js         # Tenant rollback
```

## Architecture

- **Public Schema**: Contains shared tables like `tenants`, `focus_areas`, `coaching_categories`
- **Tenant Schemas**: Isolated schemas per organization (e.g., `tid_cf4116b064`) containing tenant-specific tables like `org_users`, `org_settings`, `chat_messages`

## SSL Configuration (Production/RDS)

For connecting to AWS RDS or other SSL-enabled databases:

1. **Download RDS Certificate** (if using AWS RDS):
   ```bash
   curl -o ssl/rds-ca-2019-root.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   ```

2. **Update `.env`:**
   ```env
   DB_SSL=true
   DB_SSL_CERT_PATH=ssl/rds-ca-2019-root.pem
   DB_SSL_REJECT_UNAUTHORIZED=true
   ```

## Troubleshooting

**Error: "type 'vector' does not exist"**
- Ensure the `vector` extension is installed in the public schema (see Database Setup step 4)

**Error: "permission denied for schema"**
- Verify the database user has ownership of the `public` schema

**SSL Connection Issues**
- Verify the certificate file exists at the specified path
- Check that `DB_SSL_REJECT_UNAUTHORIZED` is set appropriately for your environment

## License

ISC
