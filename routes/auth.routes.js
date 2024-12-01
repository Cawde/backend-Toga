const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

/* IMPORTANT NOTE: 
    "authenticateToken" means that the user's token MUST BE passed into the header when doing an HTTP Request for that function to work. 
    Otherwise an unauthorized error will be returned.
*/


const isValidLsuEmail = (email) => {
  return email.toLowerCase().endsWith('@lsu.edu');
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, username, full_name } = req.body;
    
    if (!isValidLsuEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email domain', 
        message: 'Only LSU email addresses (@lsu.edu) are allowed to register' 
      });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, username, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, full_name`,
      [email, hashedPassword, username, full_name]
    );

    const token = jwt.sign(
      { id: rows[0].id, email: rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ user: rows[0], token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidLsuEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email domain', 
        message: 'Only LSU email addresses (@lsu.edu) are allowed' 
      });
    }

    // get the user
    const userResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Get organization information through members table
    const orgResult = await db.query(`
      SELECT o.id as organization_id, o.name as organization_name 
      FROM organizations o
      JOIN members m ON o.id = m.organization_id
      WHERE m.user_id = $1
    `, [userResult.rows[0].id]);

    const { password_hash, ...user } = userResult.rows[0];

    // Add organization info to user object
    user.organization = orgResult.rows[0] || null;

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        organization_id: user.organization?.organization_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      user, 
      token,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

module.exports = router;