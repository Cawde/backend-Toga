const db = require("./database");
const bcrypt = require("bcrypt");
/*  IMPORTANT: Purpose of this file is to insert sample user for testing. 
    Will need much more seed data for a fully functioning and testable app!
*/
const createTables = async () => {
  try {
    // Enable UUID extension
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
    console.log("UUID extension enabled");
    await db.query(`DROP TYPE IF EXISTS clothing_items CASCADE;`);
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
    console.log("Users table created successfully");

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
    console.log("Clothing items table created successfully");

    // Create transactions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        item_id UUID REFERENCES clothing_items(id),
        buyer_id UUID REFERENCES users(id),
        seller_id UUID REFERENCES users(id),
        transaction_type VARCHAR(20) NOT NULL,
        status VARCHAR(50) NOT NULL,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Transactions table created successfully");

    // Create messages table
    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        sender_id UUID REFERENCES users(id),
        receiver_id UUID REFERENCES users(id),
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Messages table created successfully");

    // Create events table
    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        creator_id UUID REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date TIMESTAMP NOT NULL,
        location VARCHAR(255),
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Events table created successfully");

    // Insert sample user for testing
    const hashedPassword = await bcrypt.hash('password123', 10);
    await db.query(`
      INSERT INTO users (email, password_hash, username, full_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['testuser@lsu.edu', hashedPassword, 'testuser', 'Test User']
    );
    console.log("Sample user created successfully");

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
    console.log("Sample clothing item created successfully");

    // Insert sample event
    await db.query(`
      INSERT INTO events (
        creator_id,
        title,
        description,
        event_date,
        location,
        image_url
      )
      SELECT 
        (SELECT id FROM users WHERE email = 'test@example.com'),
        'Summer Fashion Show',
        'Annual summer fashion exhibition',
        CURRENT_TIMESTAMP + interval '30 days',
        'Central Park',
        'event1.jpg'
      WHERE NOT EXISTS (
        SELECT 1 FROM events WHERE title = 'Summer Fashion Show'
      )
    `);
    console.log("Sample event created successfully");

    
    // Insert sample message
    const testUserId = await db.query("SELECT id FROM users WHERE email = $1", [
      "test@example.com",
    ]);
    if (testUserId.rows.length > 0) {
      await db.query(
        `
        INSERT INTO messages (
          sender_id,
          receiver_id,
          content
        )
        VALUES ($1, $1, $2)
        ON CONFLICT DO NOTHING
      `,
        [testUserId.rows[0].id, "Welcome to the platform!"]
      );
      console.log("Sample message created successfully");
    }

    console.log("All tables and sample data created successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

// Run the initialization
createTables()
  .then(() => {
    console.log("Database initialization completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });

  module.exports = createTables;