/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('coaching_categories', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description').notNullable();
    table.string('slug', 100).notNullable().unique();
    table.string('color', 10).nullable().defaultTo('#FFFFFF'); // hex color for UI (e.g., #FF5733)
    table.string('icon', 50).notNullable(); // lucide-react icon name
    table.string('image_url', 500).nullable();
    table.integer('display_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();

    // Indexes for common queries
    table.index('slug');
    table.index('is_active');
    table.index('display_order');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('coaching_categories');
};
