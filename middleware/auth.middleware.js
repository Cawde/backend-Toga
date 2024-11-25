const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

const authenticateClerk = ClerkExpressRequireAuth({
  onError: (err, req, res) => {
    res.status(401).json({ error: "Unauthorized" });
  },
});

module.exports = { authenticateClerk };