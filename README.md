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

## Workflow: Starting a New Project

When setting up a new project from scratch, follow these steps in order after application setup step:

### Step 1: Migrate Master Schema

**Command:**
```bash
pnpm migrate:master
```

**What it does:**
- Runs all migrations in `src/master/migrations/`
- Creates the `tenants` table in the `public` schema
- Creates other shared/public schema tables if presents (e.g., `countries`, `categories`)

**Prerequisites:**
- Ensure `src/master/migrations/20251103123228_init_db.js` exists (this creates the `tenants` table)
- The `init_db.js` migration must always be present and run first

**Outcome:**
- ✅ `public.tenants` table is created and ready to store tenant records
- ✅ All master/public schema tables are initialized
- ✅ Migration tracking table `knex_migrations_master` is created

---

### Step 2: Provision Default Tenant

**Command:**
```bash
pnpm provision:tenant default_tenant
```

**What it does:**
- Creates a new schema for the tenant (e.g., `tid_cf4116b064`)
- Registers the tenant in the `public.tenants` table with status `PROVISIONING`
- Ensures the `vector` extension is available in the public schema
- Runs initial tenant migrations (if any exist)

**Outcome:**
- ✅ A new tenant schema is created (named using a hash of the `clerk_org_id`)
- ✅ Record added to `public.tenants` table mapping `clerk_org_id` → `schema_name`
- ✅ Tenant status set to `ACTIVE` after successful migration
- ✅ Initial tenant schema is ready for tables

**Note:** The `default_tenant` is typically used for development/testing. In production, you'll provision tenants when you onboard a new organization.

---

### Step 3: Create Tenant Migrations

**Command:**
```bash
pnpm migrate:make:tenant <migration_name>
```

**What it does:**
- Creates a new migration file in `src/tenants/migrations/`
- Generates a timestamp-prefixed filename (e.g., `20251103170000_add_user_preferences.js`)

**Examples:**
```bash
pnpm migrate:make:tenant add_user_preferences
pnpm migrate:make:tenant user_message_history
```

**Outcome:**
- ✅ New migration file created at `src/tenants/migrations/[timestamp]_<migration_name>.js`
- ✅ File contains skeleton `exports.up` and `exports.down` functions
- ✅ Ready to implement your table changes

**Important:** Edit the migration file to implement your schema changes before running step 4.

---

### Step 4: Run Tenant Migrations

**Command:**
```bash
pnpm migrate:tenants
```

**What it does:**
- Runs all pending migrations in `src/tenants/migrations/` against all active tenant schemas
- Applies migrations in order based on timestamp
- Updates migration tracking table `knex_migrations_tenant` in each tenant schema

**Outcome:**
- ✅ All tenant schemas (including `default_tenant`) have the new tables/columns
- ✅ Schema changes are synchronized across all tenants
- ✅ Migration history is tracked per tenant schema

**Note:** If provisioning fails for a specific tenant, it will be marked as `FAILED` in the `tenants` table.

---

## Quick Start Checklist

For a new project, execute these commands in sequence:

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables (create .env file)
# See "Application Setup" section above

# 3. Migrate master schema (creates tenants table)
pnpm migrate:master

# 4. Provision default tenant for development
pnpm provision:tenant default_tenant

# 5. Create your first tenant migration (optional)
pnpm migrate:make:tenant initial_tables

# 6. Edit the migration file, then run it
pnpm migrate:tenants
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

## References

### Knex.js Documentation

This project uses [Knex.js](https://knexjs.org/) as the query builder and migration tool. For more information, see:

- **[Knex.js Guide](https://knexjs.org/guide/)** - Complete guide to Knex.js features and configuration
- **[Migrations Guide](https://knexjs.org/guide/migrations.html)** - Detailed documentation on creating and managing database migrations
- **[Schema Builder](https://knexjs.org/guide/schema-builder.html)** - Reference for building database schemas with Knex

### Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Extension](https://github.com/pgvector/pgvector) - Vector similarity search for PostgreSQL

## License

ISC
