const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const db = require('../config/database');

/* IMPORTANT NOTE: 
    "authenticateToken" means that the user's token MUST BE passed into the header when doing an HTTP Request for that function to work. 
    Otherwise an unauthorized error will be returned.
*/


// Create an event
router.post('/', authenticateToken, async (req, res) => {
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


router.get('/clothes', async (req, res) => {
  try {
    const { event } = req.query;
    const { rows } = await db.query(
        `
                SELECT 
                    c.id AS clothing_id,
                    c.owner_id,
                    c.title,
                    c.description,
                    c.category,
                    c.size,
                    c.condition,
                    c.purchase_price,
                    c.rental_price,
                    c.is_available_for_rent,
                    c.is_available_for_sale,
                    c.images,
                    c.created_at,
                    c.updated_at
                FROM 
                    event_Listings e
                JOIN 
                    clothing_items c ON e.clothing_id = c.id
                WHERE 
                    e.event_id = $1`,
        [event]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clothes/add', async (req, res) => {
  try {
    const { clothing_item, event } = req.body;
    const { rows } = await db.query(
        `
               INSERT INTO event_listings (event_id, clothing_id)
                VALUES ($1, $2)`,[event, clothing_item]
    );
    res.json(rows);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during event clothes add' });
  }
});

router.post('/clothes/remove', async (req, res) => {
  try {
    const { event, clothing_item } = req.body;
    const { rows } = await db.query(
        `
               DELETE FROM event_listings
               WHERE event_id = $1 AND clothing_id = $2`,[event, clothing_item]
    );
    res.json(rows);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10,  organization} = req.query;
    
    const { rows } = await db.query(
      `SELECT 
    e.id AS event_id,
    e.title,
    e.description,
    e.event_date AS event_begin,
    e.event_date + INTERVAL '3 days' AS event_end,
    e.location,
    e.image_url,
    o.name AS organizer_name
FROM 
    events e
JOIN 
    members m
ON 
    e.creator_id = m.organization_id
JOIN 
    organizations o
ON 
    e.creator_id = o.id
WHERE 
    m.user_id = $1;`,
      [organization]
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
router.put('/:id', authenticateToken, async (req, res) => {
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
router.delete('/:id', authenticateToken, async (req, res) => {
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