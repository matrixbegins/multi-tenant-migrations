# Deployment Guide

This guide covers containerization and deployment strategies for running database migrations in CI/CD pipelines and containerized environments.

## Table of Contents

- [Containerization](#containerization)
- [Docker Setup](#docker-setup)
- [CI/CD Integration](#cicd-integration)
- [Deployment Patterns](#deployment-patterns)
- [Best Practices](#best-practices)

## Containerization

The migration system is containerized using Docker to ensure consistent execution across different environments (local, staging, production).

### Dockerfile

The project includes a `Dockerfile` that:
- Uses Node.js 22 (matching project requirements)
- Installs pnpm 10.18.2
- Copies migration files and dependencies
- Includes SSL certificates for RDS connections
- Supports multiple entry points via environment variables

### Entrypoint Script

The `scripts/entrypoint.sh` script supports different migration modes:

- `master` - Run master schema migrations
- `tenants` - Run tenant schema migrations
- `provision` - Provision a new tenant (requires `CLERK_ORG_ID`)
- `rollback-master` - Rollback master migrations
- `rollback-tenants` - Rollback tenant migrations

## Docker Setup

### Building the Image

```bash
docker build -t db-migrations:latest .
```

### Running Migrations Locally

```bash
# Run master migrations
docker run --rm \
  -e DB_HOST=localhost \
  -e DB_PORT=5432 \
  -e DB_USER=dev_user \
  -e DB_PASSWORD=dev_pass123 \
  -e DB_NAME=my_db \
  -e DB_SSL=false \
  -e MIGRATION_TYPE=master \
  db-migrations:latest

# Run tenant migrations
docker run --rm \
  -e DB_HOST=localhost \
  -e DB_PORT=5432 \
  -e DB_USER=dev_user \
  -e DB_PASSWORD=dev_pass123 \
  -e DB_NAME=my_db \
  -e DB_SSL=false \
  -e MIGRATION_TYPE=tenants \
  db-migrations:latest

# Provision a tenant
docker run --rm \
  -e DB_HOST=localhost \
  -e DB_PORT=5432 \
  -e DB_USER=dev_user \
  -e DB_PASSWORD=dev_pass123 \
  -e DB_NAME=my_db \
  -e DB_SSL=false \
  -e MIGRATION_TYPE=provision \
  -e CLERK_ORG_ID=default_tenant \
  db-migrations:latest
```

### Docker Compose (Local Testing)

Create a `docker-compose.yml` for local development:

```yaml
version: '3.8'

services:
  migrations:
    build: .
    environment:
      - DB_HOST=${DB_HOST:-postgres}
      - DB_PORT=${DB_PORT:-5432}
      - DB_USER=${DB_USER:-postgres}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME:-my_db}
      - DB_SSL=${DB_SSL:-false}
      - DB_SSL_CERT_PATH=${DB_SSL_CERT_PATH:-}
      - DB_SSL_REJECT_UNAUTHORIZED=${DB_SSL_REJECT_UNAUTHORIZED:-true}
      - MIGRATION_TYPE=master
      - CLERK_ORG_ID=${CLERK_ORG_ID:-}
    depends_on:
      - postgres
    networks:
      - app-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-my_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

Usage:
```bash
# Run master migrations
MIGRATION_TYPE=master docker-compose run --rm migrations

# Run tenant migrations
MIGRATION_TYPE=tenants docker-compose run --rm migrations

# Provision tenant
MIGRATION_TYPE=provision CLERK_ORG_ID=default_tenant docker-compose run --rm migrations
```

## CI/CD Integration

### Pattern 1: GitHub Actions

Create `.github/workflows/migrate.yml`:

```yaml
name: Database Migrations

on:
  push:
    branches: [main]
    paths:
      - 'src/master/migrations/**'
      - 'src/tenants/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10.18.2

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Docker image
        run: |
          docker build -t migrations:latest .

      - name: Run master migrations
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_PORT: ${{ secrets.DB_PORT }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          DB_NAME: ${{ secrets.DB_NAME }}
          DB_SSL: 'true'
          DB_SSL_CERT_PATH: ssl/rds-ca-2019-root.pem
          DB_SSL_REJECT_UNAUTHORIZED: 'true'
          MIGRATION_TYPE: master
        run: |
          docker run --rm migrations:latest

      - name: Run tenant migrations
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_PORT: ${{ secrets.DB_PORT }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          DB_NAME: ${{ secrets.DB_NAME }}
          DB_SSL: 'true'
          DB_SSL_CERT_PATH: ssl/rds-ca-2019-root.pem
          DB_SSL_REJECT_UNAUTHORIZED: 'true'
          MIGRATION_TYPE: tenants
        run: |
          docker run --rm migrations:latest
```

**Required Secrets:**
- `DB_HOST` - Database hostname
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name

### Pattern 2: AWS Fargate / ECS Task

#### Task Definition

Create `aws/task-definition.json`:

```json
{
  "family": "db-migrations",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "migrations",
      "image": "your-ecr-repo/db-migrations:latest",
      "essential": true,
      "environment": [
        { "name": "DB_HOST", "value": "your-rds-endpoint.region.rds.amazonaws.com" },
        { "name": "DB_PORT", "value": "5432" },
        { "name": "DB_NAME", "value": "my_db" },
        { "name": "DB_SSL", "value": "true" },
        { "name": "DB_SSL_CERT_PATH", "value": "ssl/rds-ca-2019-root.pem" },
        { "name": "DB_SSL_REJECT_UNAUTHORIZED", "value": "true" },
        { "name": "MIGRATION_TYPE", "value": "master" }
      ],
      "secrets": [
        {
          "name": "DB_USER",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-credentials:username::"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-credentials:password::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/db-migrations",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "migrations"
        }
      }
    }
  ]
}
```

#### Deployment Script

Create `scripts/deploy-ecs.sh`:

```bash
#!/bin/bash
# deploy-ecs.sh

set -e

IMAGE_TAG=${1:-latest}
MIGRATION_TYPE=${2:-master}
CLUSTER_NAME=${CLUSTER_NAME:-your-cluster}
TASK_DEFINITION=${TASK_DEFINITION:-db-migrations}
ECR_REPO=${ECR_REPO:-your-account.dkr.ecr.region.amazonaws.com/db-migrations}

# Step 1: Build and push image
echo "Building Docker image..."
docker build -t $ECR_REPO:$IMAGE_TAG .
docker push $ECR_REPO:$IMAGE_TAG

# Step 2: Update task definition
echo "Updating task definition..."
aws ecs register-task-definition \
  --cli-input-json file://aws/task-definition.json \
  --region us-east-1

# Step 3: Run migration task
echo "Running migration task: $MIGRATION_TYPE"
TASK_ARN=$(aws ecs run-task \
  --cluster $CLUSTER_NAME \
  --task-definition $TASK_DEFINITION \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --overrides "{\"containerOverrides\":[{\"name\":\"migrations\",\"environment\":[{\"name\":\"MIGRATION_TYPE\",\"value\":\"$MIGRATION_TYPE\"}]}]}" \
  --region us-east-1 \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Task started: $TASK_ARN"
echo "Monitoring task status..."

# Wait for task to complete
aws ecs wait tasks-stopped \
  --cluster $CLUSTER_NAME \
  --tasks $TASK_ARN \
  --region us-east-1

# Check exit code
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster $CLUSTER_NAME \
  --tasks $TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

if [ "$EXIT_CODE" != "0" ]; then
  echo "Migration failed with exit code: $EXIT_CODE"
  exit 1
fi

echo "Migration completed successfully"
```

**Usage:**
```bash
# Deploy master migrations
./scripts/deploy-ecs.sh v1.0.0 master

# Deploy tenant migrations
./scripts/deploy-ecs.sh v1.0.0 tenants
```

### Pattern 3: Kubernetes Job

Create `k8s/migration-job.yaml`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrations-master
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: migrations
        image: your-registry/db-migrations:latest
        imagePullPolicy: Always
        env:
        - name: DB_HOST
          value: "postgres-service.production.svc.cluster.local"
        - name: DB_PORT
          value: "5432"
        - name: DB_NAME
          value: "my_db"
        - name: DB_SSL
          value: "true"
        - name: DB_SSL_CERT_PATH
          value: "ssl/rds-ca-2019-root.pem"
        - name: DB_SSL_REJECT_UNAUTHORIZED
          value: "true"
        - name: MIGRATION_TYPE
          value: "master"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      restartPolicy: Never
  backoffLimit: 3
  activeDeadlineSeconds: 600
```

**Deploy:**
```bash
# Master migrations
kubectl apply -f k8s/migration-job.yaml

# Monitor
kubectl logs -f job/db-migrations-master -n production

# Tenant migrations (update MIGRATION_TYPE)
kubectl patch job db-migrations-master -p '{"spec":{"template":{"spec":{"containers":[{"name":"migrations","env":[{"name":"MIGRATION_TYPE","value":"tenants"}]}]}}}}'
```

## Deployment Patterns

### Recommended Workflow

1. **Master Migrations First**
   - Always run master migrations before tenant migrations
   - Master schema changes affect the `tenants` table and shared data

2. **Sequential Execution**
   - Master → Tenants (do not run in parallel)
   - Use job dependencies or wait for completion

3. **Idempotency**
   - Migrations should be safe to re-run
   - Knex handles this via migration tracking tables

4. **Rollback Strategy**
   - Keep previous image tags available
   - Document rollback procedures for each migration

5. **Health Checks**
   - Verify migration success before deploying application
   - Check migration status tables

### Environment-Specific Deployment

#### Staging
```bash
# Use staging-specific task definition
MIGRATION_TYPE=master \
  DB_HOST=staging-db.example.com \
  ./scripts/deploy-ecs.sh staging-latest master
```

#### Production
```bash
# Use production-specific task definition with production credentials
MIGRATION_TYPE=master \
  DB_HOST=prod-db.example.com \
  ./scripts/deploy-ecs.sh prod-v1.2.3 master
```

## Best Practices

### 1. Image Management

- **Separate Images**: Build migration images separately from application images
- **Version Tagging**: Tag images with migration version or git commit SHA
- **Base Image Updates**: Regularly update Node.js base image for security patches

### 2. Security

- **Secrets Management**: Use AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets
- **SSL Certificates**: Always include RDS certificates in production
- **Least Privilege**: Database user should have only necessary permissions

### 3. Monitoring & Logging

- **CloudWatch Logs**: Configure log groups for ECS/K8s deployments
- **Migration Tracking**: Monitor `knex_migrations_master` and `knex_migrations_tenant` tables
- **Alerting**: Set up alerts for migration failures
- **Audit Trail**: Log all migration runs with timestamps and outcomes

### 4. Error Handling

- **Timeout Configuration**: Set appropriate timeouts for long-running migrations
- **Retry Logic**: Use `backoffLimit` in Kubernetes or ECS retry policies
- **Failure Notifications**: Send alerts to Slack/Email on migration failures
- **Rollback Procedures**: Document rollback steps for each migration

### 5. Performance

- **Connection Pooling**: Knex handles this automatically via pool configuration
- **Parallel Tenant Migrations**: Consider running tenant migrations in parallel (with caution)
- **Database Load**: Schedule migrations during low-traffic periods

### 6. Testing

- **Test in Staging First**: Always test migrations in staging before production
- **Backup Strategy**: Take database backups before running migrations
- **Dry Runs**: Use `--dry` flag when available for validation

## Troubleshooting

### Common Issues

**Issue: Container exits immediately**
- Check environment variables are properly set
- Verify database connectivity
- Check container logs: `docker logs <container-id>`

**Issue: SSL connection errors**
- Verify certificate file exists in container
- Check `DB_SSL_CERT_PATH` is correct
- Ensure `DB_SSL_REJECT_UNAUTHORIZED` is set appropriately

**Issue: Permission denied errors**
- Verify database user has required permissions
- Check schema ownership settings
- Review database user grants

**Issue: Migration already applied**
- This is normal - Knex tracks applied migrations
- Check `knex_migrations_*` tables to see migration status

### Debug Commands

```bash
# Check migration status
docker run --rm -it \
  -e DB_HOST=your-db \
  -e DB_USER=user \
  -e DB_PASSWORD=pass \
  -e DB_NAME=my_db \
  db-migrations:latest \
  node -e "const knex = require('knex')(require('./knexfile.cjs').development); knex.migrate.status().then(console.log)"

# Test database connection
docker run --rm -it \
  -e DB_HOST=your-db \
  -e DB_USER=user \
  -e DB_PASSWORD=pass \
  -e DB_NAME=my_db \
  db-migrations:latest \
  node -e "const knex = require('knex')(require('./knexfile.cjs').development); knex.raw('SELECT 1').then(() => console.log('Connected'))"
```

## Additional Resources

- [Knex.js Migrations Guide](https://knexjs.org/guide/migrations.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [AWS ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
