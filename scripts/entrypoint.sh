#!/bin/bash
# entrypoint.sh

set -e

echo "Starting database migrations..."

# Determine migration type from environment variable
MIGRATION_TYPE=${MIGRATION_TYPE:-"master"}

case "$MIGRATION_TYPE" in
  "master")
    echo "Running master schema migrations..."
    node --trace-uncaught src/migrateMaster.js
    ;;

  "tenants")
    echo "Running tenant schema migrations..."
    node --trace-uncaught src/migrateTenant.js
    ;;

  "provision")
    if [ -z "$CLERK_ORG_ID" ]; then
      echo "Error: CLERK_ORG_ID is required for tenant provisioning"
      exit 1
    fi
    echo "Provisioning tenant: $CLERK_ORG_ID"
    node --trace-uncaught src/provisionTenant.js "$CLERK_ORG_ID"
    ;;

  "rollback-master")
    echo "Rolling back master migrations..."
    node --trace-uncaught src/rollbackMaster.js
    ;;

  "rollback-tenants")
    echo "Rolling back tenant migrations..."
    node --trace-uncaught src/rollbackTenant.js
    ;;

  *)
    echo "Unknown migration type: $MIGRATION_TYPE"
    echo "Valid types: master, tenants, provision, rollback-master, rollback-tenants"
    exit 1
    ;;
esac

echo "Migrations completed successfully"

