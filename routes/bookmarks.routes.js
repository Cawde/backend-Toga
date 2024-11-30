const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

/* IMPORTANT NOTE:
    "authenticateToken" means that the user's token MUST BE passed into the header when doing an HTTP Request for that function to work.
    Otherwise an unauthorized error will be returned.
*/

router.get('/', async (req, res) => {
    try {
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
                    bookmarks b
                JOIN 
                    clothing_items c ON b.clothing_id = c.id
                WHERE 
                    b.user_id = $1`,
            [req.params.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/add', async (req, res) => {
    try {
        const { user, clothing_item } = req.body;
        const { rows } = await db.query(
            `
               INSERT INTO bookmarks (user_id, clothing_id)
                VALUES ($1, $2)`,[user, clothing_item]
        );
        res.json(rows);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

router.post('/remove', async (req, res) => {
    try {
        const { user, clothing_item } = req.body;
        const { rows } = await db.query(
            `
               DELETE FROM bookmarks
               WHERE user_id = $1 AND clothing_id = $2`,[user, clothing_item]
        );
        res.json(rows);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

module.exports = router;