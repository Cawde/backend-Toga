const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('../routes/auth.routes');
const itemRoutes = require('../routes/items.routes');
const userRoutes = require('../routes/users.routes');
const transactionRoutes = require('../routes/transactions.routes');
const messageRoutes = require('../routes/messages.routes');
const eventRoutes = require('../routes/events.routes');
const db = require('../config/database');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/events', eventRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});