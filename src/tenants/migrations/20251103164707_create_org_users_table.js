/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('org_users', function(table) {
    table.increments('id').primary();
    table.string('clerk_user_id', 100).notNullable().unique(); // Unique Clerk user ID
    table.jsonb('notification_preferences').nullable(); // User notification preferences
    table.string('internal_role', 50).nullable(); // Org-specific role (e.g., 'approver', 'contributor')
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();

    // Index for fast lookups by Clerk user ID
    table.index('clerk_user_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('org_users');
};
