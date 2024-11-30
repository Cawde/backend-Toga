const db = require("./database");
const bcrypt = require("bcrypt");
const fs = require('fs');
/*  IMPORTANT: Purpose of this file is to insert sample user for testing. 
    Will need much more seed data for a fully functioning and testable app!
*/
const createTables = async () => {
  try {
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
    console.log("UUID extension enabled");

    try {
      await db.query(`DROP TABLE IF EXISTS users CASCADE;`);
      await db.query(`DROP TABLE IF EXISTS clothing_items CASCADE;`);
      await db.query(`DROP TABLE IF EXISTS events CASCADE;`);
      await db.query(`DROP TABLE IF EXISTS members CASCADE;`);
      await db.query(`DROP TABLE IF EXISTS messages CASCADE;`);
      await db.query(`DROP TABLE IF EXISTS organizations CASCADE;`);
      await db.query(`DROP TABLE IF EXISTS transactions CASCADE;`);
    } catch (e) {
      console.log("No existing type to drop");
    }

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


    await db.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        owner_id UUID REFERENCES users(id),
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Organizations table created successfully");

    await db.query(`
      CREATE TABLE IF NOT EXISTS members (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Members table created successfully");

    // Create events table
    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        creator_id UUID REFERENCES organizations(id),
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

    await db.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          clothing_id UUID REFERENCES clothing_items(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Bookmarks table created successfully");

    const users = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));

    for (const user of users) {
      const { email, username, full_name, password } = user;
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
          `INSERT INTO users (email, username, full_name, password_hash)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (email) DO NOTHING`,
          [email, username, full_name, hashedPassword]
      );
    }

    const organizations = JSON.parse(fs.readFileSync('data/organizations.json', 'utf8'));

    for (const organization of organizations) {
      const { owner_name, name, created_at, updated_at } = organization;

      const existingItem = await db.query(
          `SELECT 1 FROM users WHERE username = $1`,
          [name]
      );

      const ownerResult = await db.query(`SELECT id FROM users WHERE username = $1`, [owner_name]);

      if (ownerResult.rowCount === 0) {
        console.error(`Owner with username "${owner_name}" not found`);
        continue; // Skip this record if the owner is not found
      }

      const owner_id = ownerResult.rows[0].id;

      if (existingItem.rowCount === 0) {
        await db.query(
            `INSERT INTO organizations (
                owner_id, name, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
                      [owner_id, name, created_at, updated_at]
                );
      }
      await db.query(
          `INSERT INTO organizations (owner_id, name, created_at, updated_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (name) DO NOTHING`,
          [owner_id, name, created_at, updated_at]
      );
    }

    const clothing_items = JSON.parse(fs.readFileSync('data/clothingItems.json', 'utf8'));

    for (const clothing_item of clothing_items) {
      const { username, title, description, category, size, condition, purchase_price, rental_price, is_available_for_rent, is_available_for_sale, images } = clothing_item;

      const existingItem = await db.query(
          `SELECT 1 FROM clothing_items WHERE title = $1`,
          [title]
      );

      const ownerResult = await db.query(`SELECT id FROM users WHERE username = $1`, [username]);

      if (ownerResult.rowCount === 0) {
        console.error(`Owner with username "${owner_name}" not found`);
        continue; // Skip this record if the owner is not found
      }

      const owner_id = ownerResult.rows[0].id;

      if (existingItem.rowCount === 0) {
        await db.query(
            `INSERT INTO clothing_items (
        owner_id, title, description, category, size, condition, purchase_price, rental_price, is_available_for_rent, is_available_for_sale, images
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [owner_id, title, description, category, size, condition, purchase_price, rental_price, is_available_for_rent, is_available_for_sale, images]
        );
      }
    }

    const events = JSON.parse(fs.readFileSync('data/events.json', 'utf8'));

    for (const event of events) {
      const { creator_name, title, description, event_date, location, image_url } = event;

      const existingItem = await db.query(
          `SELECT 1 FROM clothing_items WHERE title = $1`,
          [title]
      );

      const ownerResult = await db.query(`SELECT id FROM organizations WHERE name = $1`, [creator_name]);

      if (ownerResult.rowCount === 0) {
        console.error(`Owner with username "${creator_name}" not found`);
        continue; // Skip this record if the owner is not found
      }

      const owner_id = ownerResult.rows[0].id;

      if (existingItem.rowCount === 0) {
        await db.query(
            `INSERT INTO events (
                creator_id, title, description, event_date, location, image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
            [owner_id, title, description, event_date, location, image_url]
        );
      }
    }

    const members = JSON.parse(fs.readFileSync('data/members.json', 'utf8'));

    for (const member of members) {
      const { username, orgname } = member;

      const orgResult = await db.query(`SELECT id FROM organizations WHERE name = $1`, [orgname]);
      const nameResult = await db.query(`SELECT id FROM users WHERE username = $1`, [username]);

      if (orgResult.rowCount === 0 && nameResult.rowCount === 0) {
        console.error(`Pairing already found`);
        continue; // Skip this record if the owner is not found
      }

      const org_id = orgResult.rows[0].id;
      const user_id = nameResult.rows[0].id;

      const existingItem = await db.query(
          `SELECT 1 FROM members WHERE user_id = $1 AND organization_id = $2`,
          [user_id, org_id]
      );

      if (existingItem.rowCount === 0) {
        await db.query(
            `INSERT INTO members (
                organization_id, user_id
      )
      VALUES ($1, $2)`,
            [org_id, user_id]
        );
      }
    }

    
    // Insert sample message
    const testUserId = await db.query("SELECT id FROM users WHERE email = $1", [
      "test@lsu.edu",
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
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
  });

  module.exports = createTables;