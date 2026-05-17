const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// API Endpoint to fetch data
// The path will be mapped to /api/requests in Vercel automatically if this file is api/requests.js
// Or we can just use a router here. Since we are mounting it on Vercel, if this file is api/index.js
// We can define the routes.
app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM demo_requests ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Export the app for Vercel Serverless
module.exports = app;
