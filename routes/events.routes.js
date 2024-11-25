const express = require('express');
const router = express.Router();
const { authenticateClerk } = require('../middleware/auth.middleware');
const db = require('../config/database');

/* IMPORTANT NOTE: 
    "authenticateClerk" means that the user's token MUST BE passed into the header when doing an HTTP Request for that function to work. 
    Otherwise an unauthorized error will be returned.
*/


// Create an event
router.post('/', authenticateClerk, async (req, res) => {
  try {
    const { title, description, event_date, location, image_url } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO events 
       (creator_id, title, description, event_date, location, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, title, description, event_date, location, image_url]
    );
    
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const { rows } = await db.query(
      `SELECT e.*, u.username as creator_name
       FROM events e
       JOIN users u ON e.creator_id = u.id
       WHERE event_date >= CURRENT_DATE
       ORDER BY event_date ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.*, u.username as creator_name
       FROM events e
       JOIN users u ON e.creator_id = u.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event
router.put('/:id', authenticateClerk, async (req, res) => {
  try {
    const { title, description, event_date, location, image_url } = req.body;
    
    const { rows } = await db.query(
      `UPDATE events 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           event_date = COALESCE($3, event_date),
           location = COALESCE($4, location),
           image_url = COALESCE($5, image_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND creator_id = $7
       RETURNING *`,
      [title, description, event_date, location, image_url, req.params.id, req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete event
router.delete('/:id', authenticateClerk, async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM events WHERE id = $1 AND creator_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;