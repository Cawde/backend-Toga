const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const db = require('../config/database');

/* IMPORTANT NOTE: 
    "authenticateToken" means that the user's token MUST BE passed into the header when doing an HTTP Request for that function to work. 
    Otherwise an unauthorized error will be returned.
*/


// Get all items with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, size, organization, user } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        ci.id,
        ci.owner_id,
        ci.title,
        ci.description,
        ci.category,
        ci.size,
        ci.condition,
        ci.purchase_price,
        ci.rental_price,
        ci.is_available_for_rent,
        ci.is_available_for_sale,
        ci.images,
        ci.created_at,
        ci.updated_at,
        CASE 
          WHEN b.id IS NOT NULL THEN true 
          ELSE false 
        END AS is_bookmarked
      FROM clothing_items ci
      LEFT JOIN bookmarks b 
      ON ci.id = b.clothing_id AND b.user_id = $${queryParams.length + 1}
    `;

    const queryParams = [];

    if (organization) {
      query += `
        JOIN members m ON ci.owner_id = m.user_id
        JOIN users u ON m.user_id = u.id
      `;
      queryParams.push(organization);
      query += ` WHERE m.organization_id = (
        SELECT organization_id 
        FROM members 
        WHERE user_id = $${queryParams.length}
      )`;
    } else {
      query += ' WHERE 1=1'; // Default WHERE clause
    }

    if (category) {
      queryParams.push(category);
      query += ` AND ci.category = $${queryParams.length}`;
    }

    if (size) {
      queryParams.push(size);
      query += ` AND ci.size = $${queryParams.length}`;
    }

    if (user) {
      queryParams.push(user);
      query += ` AND ci.owner_id = $${queryParams.length}`;
    }

    queryParams.push(user || organization); // For bookmark user_id in the LEFT JOIN

    queryParams.push(limit, offset);
    query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const { rows } = await db.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/', authenticateToken, async (req, res) => {
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


router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      size,
      condition,
      purchase_price,
      rental_price,
      is_available_for_rent,
      is_available_for_sale,
      images
    } = req.body;

    // First check if user owns this item
    const itemCheck = await db.query(
      'SELECT owner_id FROM clothing_items WHERE id = $1',
      [req.params.id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (itemCheck.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this item' });
    }

    const { rows } = await db.query(
      `UPDATE clothing_items 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           size = COALESCE($4, size),
           condition = COALESCE($5, condition),
           purchase_price = COALESCE($6, purchase_price),
           rental_price = COALESCE($7, rental_price),
           is_available_for_rent = COALESCE($8, is_available_for_rent),
           is_available_for_sale = COALESCE($9, is_available_for_sale),
           images = COALESCE($10, images),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND owner_id = $12
       RETURNING *`,
      [
        title,
        description,
        category,
        size,
        condition,
        purchase_price,
        rental_price,
        is_available_for_rent,
        is_available_for_sale,
        images,
        req.params.id,
        req.user.id
      ]
    );

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user owns this item
    const itemCheck = await db.query(
      'SELECT owner_id FROM clothing_items WHERE id = $1',
      [req.params.id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (itemCheck.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this item' });
    }

    // Check if item has any active transactions
    const activeTransactions = await db.query(
      `SELECT id FROM transactions 
       WHERE item_id = $1 
       AND status IN ('pending', 'active', 'in_progress')`,
      [req.params.id]
    );

    if (activeTransactions.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete item with active transactions' 
      });
    }

    await db.query(
      'DELETE FROM clothing_items WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;