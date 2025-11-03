/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('org_settings', function(table) {
    table.increments('id').primary();
    table.string('organization_id', 100).notNullable(); // clerk_org_id for reference and audits
    table.string('display_name', 255).notNullable();
    table.string('branding_logo_url', 500).nullable();
    table.string('timezone', 50).notNullable().defaultTo('UTC');
    table.integer('billing_plan_id').nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();

    // Index for fast lookups by organization ID
    table.index('organization_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('org_settings');
};
