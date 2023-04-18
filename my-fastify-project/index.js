const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'chat_app',
  password: 'password',
  port: 5432,
});

(async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to the database');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);

    console.log('Table "users" created');
  } catch (error) {
    console.error(error);
  }
})();