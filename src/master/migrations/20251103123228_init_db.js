/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('tenants', function(table) {
    table.increments('id').primary();
    table.string('clerk_org_id', 100).notNullable().unique();
    table.string('schema_name', 100).notNullable().unique();
    table.string('status', 20).notNullable().defaultTo('PROVISIONING');
    table.timestamp('started_at', { useTz: true }).nullable();
    table.timestamp('activated_at', { useTz: true }).nullable();
    table.timestamp('failed_at', { useTz: true }).nullable();
    table.text('error_message').nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('tenants');
};
