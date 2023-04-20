const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fastify = require('fastify')({ 
  logger: true, 
  multipart: true 
});;
const multer = require('multer');
const path = require('path');

fastify.register(require('fastify-multipart'), {
  addToBody: true, // Додає об'єкт request.body з розпарсеними даними multipart форми до контексту запиту
  sharedSchemaId: '#file', // Встановлює загальну схему валідації для файлів
  limits: {
    fileSize: 1000000, // Обмеження розміру файлу
  },
});


fastify.listen({
  port: 3001,
  host: 'localhost',
}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening on ${address}`)
})


const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '80669989622',
  port: 5432
});

function authenticate(request, reply, done) {
  const auth = request.headers.authorization;
  if (!auth || auth.search('Basic ') !== 0) {
    return reply.status(401).send({ error: 'Invalid authentication' });
  }
  const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [username, password] = credentials.split(':');
  if (username === 'myuser' && password === 'mypassword') {
    request.user = { id: 1 }; // добавляем объект user в request
    done();
  } else {
    reply.status(401).send({ error: 'Invalid username or password' });
  }
}
fastify.options('*',(req, res)=>res.status(200).send())


fastify.post('/account/register', async (request, reply) => {
  const { username, password } = request.body;
  console.log(request);
 
  try {
    // Перевірка ім'я користувача
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
      throw new Error('Ти шаблонний шкіряний чохол, давай другий нік, бо дівки тобі не дадуть');
    }

    // шифр пароля
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // сохранения пользователя в таблицу
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);

    reply.send({ error: 'Тепер я дізнаюсь номер твоеї карти та зніму всі гроші' });
  } catch (error) {
    console.error(error);
    reply.status(400).send({ error: error.message });
  }
  console.log(request);
});

fastify.post('/message/create/text', { preValidation: [authenticate] }, async (request, reply) => {
  console.log(request.user);
  const { content } = request.body;
  const { id: authorId } = request.user;


  try {
    const result = await pool.query('INSERT INTO messages (type, content, author_id) VALUES ($1, $2, $3) RETURNING *', ['text', content, authorId]);
    const message = result.rows[0];
    reply.send(message);
  } catch (error) {
    console.error(error);
    reply.status(400).send({ error: error.message });
  }
});

// Створення файлового повідомлення
const fileSchema = {
  type: 'object',
  required: ['file'],
  properties: {
    file: {
      type: 'object',
      properties: {
        fieldname: { type: 'string' },
        buffer: { type: 'string', format: 'binary' },
        mimetype: { type: 'string' },
        filename: { type: 'string' },
      },
    },
  },
};
fastify.post('/message/create/file', { preValidation: [authenticate], schema: { body: fileSchema, multipart: true } }, async (request, reply) => {
  const { filename, file } = request.body;
  const { id: authorId } = request.user;

  try {
    // Збереження файлу на диск
    const filePath = `./uploads/${filename}`;
    await file.toFile(filePath);
    // збереження запису про файл 
    const result = await pool.query('INSERT INTO messages (type, filename, author_id) VALUES ($1, $2, $3) RETURNING *', ['file', filename, authorId]);
    const message = result.rows[0];
    reply.send(message);
  } catch (error) {
    console.error(error);
    reply.status(400).send({ error: error.message });
  }
});

// Отримання списку повідомлень з пагінацією
fastify.get('/message/list', async (request, reply) => {
  const { page = 1, limit = 10 } = request.query;
  const offset = (page - 1) * limit;
  
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    reply.send(result.rows);
  } catch (error) {
    console.error(error);
    reply.status(400).send({ error: error.message });
  }
});

// Отримання змісту повідомлення в сирому вигляді
fastify.get('/message/content', async (request, reply) => {
  const { message_id } = request.query;

  try {
    const result = await pool.query('SELECT * FROM messages WHERE id = $1', [message_id]);
    const message = result.rows[0];

    if (!message) {
      reply.status(404).send({ error: 'Повідомлення не знайдено' });
    }

    if (message.type === 'text') {
      reply.type('text/plain').send(message.content);
    } else if (message.type === 'file') {
      const filePath = `./uploads/${message.filename}`;
      reply.type(message.content_type).sendFile(filePath);
    }
  } catch (error) {
    console.error(error);
    reply.status(400).send({ error: error.message });
  }
});