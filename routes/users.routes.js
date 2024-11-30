const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const db = require('../config/database');

/* IMPORTANT NOTE: 
    "authenticateToken" means that the user's token MUST BE passed into the header when doing an HTTP Request for that function to work. 
    Otherwise an unauthorized error will be returned.
*/

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `  SELECT 
      u.id,
      u.email,
      u.username,
      u.full_name,
      u.profile_picture_url,
      u.created_at,
      u.updated_at,
      COALESCE(json_agg(o.name) FILTER (WHERE o.name IS NOT NULL), '[]') AS organization_names
  FROM 
      users u
  LEFT JOIN 
      members m ON u.id = m.user_id
  LEFT JOIN 
      organizations o ON m.organization_id = o.id
  WHERE 
      u.id = $1
  GROUP BY 
      u.id;`,
      [req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, profile_picture_url } = req.body;
    
    const { rows } = await db.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           profile_picture_url = COALESCE($2, profile_picture_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, username, full_name, profile_picture_url`,
      [full_name, profile_picture_url, req.user.id]
    );
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;