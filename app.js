require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_management',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.end();

    pool = mysql.createPool(dbConfig);

    const conn = await pool.getConnection();
    await conn.query(`USE \`${dbConfig.database}\``);

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS schools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(500) NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await conn.query(createTableQuery);

    conn.release();
    console.log(' Database and table initialized successfully');
  } catch (error) {
    console.error(' Database initialization error:', error);
    throw error;
  }
}

app.get('/', (req, res) => {
  res.send('Server is running ');
});

app.post('/addSchool', async (req, res) => {
  try {
    const { name, address, latitude, longitude } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)`,
      [name, address, latitude, longitude]
    );
    res.json({ id: result.insertId, message: 'School added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add school' });
  }
});

app.get('/listSchools', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM schools`);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

async function startServer() {
  try {
    await initializeDatabase();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(` Server running on ${PORT} port`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();
