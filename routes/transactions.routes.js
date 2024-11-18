const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const db = require('../config/database');

// Create a new transaction (rent or buy)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { item_id, transaction_type, start_date, end_date } = req.body;
    
    // Get item details to verify availability and get seller_id
    const itemResult = await db.query(
      'SELECT owner_id, purchase_price, rental_price FROM clothing_items WHERE id = $1',
      [item_id]
    );
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = itemResult.rows[0];
    const price = transaction_type === 'RENT' ? item.rental_price : item.purchase_price;
    
    // Create transaction
    const { rows } = await db.query(
      `INSERT INTO transactions 
       (item_id, buyer_id, seller_id, transaction_type, status, start_date, end_date, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [item_id, req.user.id, item.owner_id, transaction_type, 'PENDING', 
       start_date, end_date, price]
    );
    
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's transactions (as buyer or seller)
router.get('/my-transactions', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, 
              c.title as item_title, 
              c.images as item_images,
              u.username as other_party_username
       FROM transactions t
       JOIN clothing_items c ON t.item_id = c.id
       JOIN users u ON (
         CASE 
           WHEN t.buyer_id = $1 THEN t.seller_id = u.id
           ELSE t.buyer_id = u.id
         END
       )
       WHERE t.buyer_id = $1 OR t.seller_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update transaction status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await db.query(
      `UPDATE transactions 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND (buyer_id = $3 OR seller_id = $3)
       RETURNING *`,
      [status, req.params.id, req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;