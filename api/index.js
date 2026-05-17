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
app.delete('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM demo_requests WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (err) {
    console.error('Error deleting record', err.stack);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.put('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, company_name, business_type, email, phone, service, message } = req.body;
    const result = await pool.query(
      'UPDATE demo_requests SET full_name = $1, company_name = $2, business_type = $3, email = $4, phone = $5, service = $6, message = $7 WHERE id = $8 RETURNING *',
      [full_name, company_name, business_type, email, phone, service, message, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Record updated successfully' });
  } catch (err) {
    console.error('Error updating record', err.stack);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

module.exports = app;
