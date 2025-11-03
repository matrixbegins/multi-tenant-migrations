/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // search_path is already set in db.js via searchPath: [schema, 'public']
  // This allows access to pgvector extension in public schema
  // Create table with standard columns first
  return knex.schema.createTable('chat_messages', function(table) {
    table.increments('id').primary();
    table.string('session_id', 100).notNullable();
    table.enum('role', ['USER', 'ASSISTANT', 'SYSTEM']).notNullable();
    table.text('content').notNullable();
    table.enum('content_type', ['TEXT', 'JSON', 'AUDIO']).notNullable().defaultTo('TEXT');
    table.jsonb('metadata').nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();

    table.index('session_id');
    table.index('role');
  })
  .then(() => {
    // Add vector(786) column using raw SQL since Knex doesn't support pgvector natively
    // The search_path set in db.js ([schema, 'public']) allows access to vector type
    return knex.raw(`
      ALTER TABLE chat_messages
      ADD COLUMN embedding_vector vector(786);
    `);
  })
  .then(() => {
    // Create an IVFFlat index on the vector column for similarity search
    return knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_embedding
      ON chat_messages
      USING ivfflat (embedding_vector vector_cosine_ops)
      WITH (lists = 100)
      WHERE embedding_vector IS NOT NULL;
    `);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('chat_messages');
};
