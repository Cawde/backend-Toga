const express = require('express');
const router = express.Router();
const { authenticateClerk } = require('../middleware/auth.middleware');
const db = require('../config/database');

/* IMPORTANT NOTE: 
    "authenticateClerk" means that the user's token MUST BE passed into the header when doing an HTTP Request for that function to work. 
    Otherwise an unauthorized error will be returned.
*/


// Get all items with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, size } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM clothing_items WHERE 1=1';
    const queryParams = [];
    
    if (category) {
      queryParams.push(category);
      query += ` AND category = $${queryParams.length}`;
    }
    
    if (size) {
      queryParams.push(size);
      query += ` AND size = $${queryParams.length}`;
    }
    
    queryParams.push(limit, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const { rows } = await db.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateClerk, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      size,
      condition,
      purchase_price,
      rental_price,
      images
    } = req.body;

    const { rows } = await db.query(
      `INSERT INTO clothing_items 
       (owner_id, title, description, category, size, condition, 
        purchase_price, rental_price, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, title, description, category, size, condition,
       purchase_price, rental_price, images]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM clothing_items WHERE id = $1',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;