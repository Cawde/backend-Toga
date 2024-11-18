const db = require('./database');
const bcrypt = require('bcrypt');

const createTables = async () => {
  try {
    // Enable UUID extension
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
    console.log('UUID extension enabled');

    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100),
        profile_picture_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created successfully');

    // Create clothing items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS clothing_items (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        size VARCHAR(20) NOT NULL,
        condition VARCHAR(50) NOT NULL,
        purchase_price DECIMAL(10,2),
        rental_price DECIMAL(10,2),
        is_available_for_rent BOOLEAN DEFAULT true,
        is_available_for_sale BOOLEAN DEFAULT true,
        images TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Clothing items table created successfully');

    // Insert sample user for testing. This will need to be added to extensively to have a well functioning app for testing.
    const hashedPassword = await bcrypt.hash('password123', 10);
    await db.query(`
      INSERT INTO users (email, password_hash, username, full_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['test@example.com', hashedPassword, 'testuser', 'Test User']);
    console.log('Sample user created successfully');

    // Insert sample clothing items
    await db.query(`
      INSERT INTO clothing_items (
        owner_id,
        title,
        description,
        category,
        size,
        condition,
        purchase_price,
        rental_price,
        images
      )
      SELECT 
        (SELECT id FROM users WHERE email = 'test@example.com'),
        'Blue Jeans',
        'Comfortable casual blue jeans',
        'pants',
        'M',
        'good',
        49.99,
        5.99,
        ARRAY['jeans1.jpg', 'jeans2.jpg']
      WHERE NOT EXISTS (
        SELECT 1 FROM clothing_items WHERE title = 'Blue Jeans'
      )
    `);
    console.log('Sample clothing item created successfully');

    console.log('All tables and sample data created successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Run the initialization
createTables()
  .then(() => {
    console.log('Database initialization completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });