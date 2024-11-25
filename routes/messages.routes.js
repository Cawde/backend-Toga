const express = require('express');
const router = express.Router();
const { authenticateClerk } = require('../middleware/auth.middleware');
const db = require('../config/database');

/* IMPORTANT NOTE: 
    "authenticateClerk" means that the user's token MUST BE passed into the header when doing an HTTP Request for that function to work. 
    Otherwise an unauthorized error will be returned.
*/

// Send a message
router.post('/', authenticateClerk, async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, receiver_id, content]
    );
    
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversations list
router.get('/conversations', authenticateClerk, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT 
         CASE 
           WHEN m.sender_id = $1 THEN m.receiver_id
           ELSE m.sender_id
         END as other_user_id,
         u.username,
         u.profile_picture_url,
         (SELECT content 
          FROM messages 
          WHERE (sender_id = $1 AND receiver_id = other_user_id)
             OR (sender_id = other_user_id AND receiver_id = $1)
          ORDER BY created_at DESC 
          LIMIT 1) as last_message,
         (SELECT created_at 
          FROM messages 
          WHERE (sender_id = $1 AND receiver_id = other_user_id)
             OR (sender_id = other_user_id AND receiver_id = $1)
          ORDER BY created_at DESC 
          LIMIT 1) as last_message_time
       FROM messages m
       JOIN users u ON (CASE 
                         WHEN m.sender_id = $1 THEN m.receiver_id
                         ELSE m.sender_id
                       END) = u.id
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       ORDER BY last_message_time DESC`,
      [req.user.id]
    );
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation messages
router.get('/:userId', authenticateClerk, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.username, u.profile_picture_url
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [req.user.id, req.params.userId]
    );
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============== Experimental features below =================

// Mark messages as read
router.put('/:messageId/read', authenticateClerk, async (req, res) => {
    try {
      const { rows } = await db.query(
        `UPDATE messages 
         SET read = true 
         WHERE id = $1 AND receiver_id = $2
         RETURNING *`,
        [req.params.messageId, req.user.id]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Message not found or unauthorized' });
      }
  
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get unread message count
  router.get('/unread/count', authenticateClerk, async (req, res) => {
    try {
      const { rows } = await db.query(
        `SELECT COUNT(*) 
         FROM messages 
         WHERE receiver_id = $1 AND read = false`,
        [req.user.id]
      );
      
      res.json({ unread_count: parseInt(rows[0].count) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;