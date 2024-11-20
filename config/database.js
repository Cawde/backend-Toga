const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const connectionConfig = isProduction
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new Pool(connectionConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
};
