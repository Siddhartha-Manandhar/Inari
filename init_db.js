const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'Charle@77', 
  port: 5432,
});

async function init() {
  try {
    const client = await pool.connect();
    
    console.log("Checking for database 'agroharvest'...");
    const dbCheck = await client.query("SELECT 1 FROM pg_database WHERE datname = 'agroharvest'");
    if (dbCheck.rowCount === 0) {
      console.log("Creating database 'agroharvest'...");
      await client.query("CREATE DATABASE agroharvest");
    }
    client.release();
    
    const ahPool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'agroharvest',
      password: 'Charle@77',
      port: 5432,
    });
    const ahClient = await ahPool.connect();
    
    console.log("Creating tables...");
    
    await ahClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        district TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        yield TEXT,
        price DECIMAL(10,2),
        harvest_date DATE,
        image TEXT,
        status TEXT DEFAULT 'Available',
        farmer_id INTEGER REFERENCES users(id),
        farmer_name TEXT,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        crop TEXT NOT NULL,
        qty TEXT,
        delivery_date DATE,
        farmer_name TEXT,
        customer_name TEXT,
        status TEXT DEFAULT 'Pending Review',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_id INTEGER,
        items JSONB NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        address TEXT,
        status TEXT DEFAULT 'Order Placed',
        farmer_name TEXT,
        delivery_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS delivery_status_history (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        changed_by TEXT,
        changed_by_role TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Database initialized successfully!");
    ahClient.release();
    process.exit(0);
  } catch (err) {
    console.error("Initialization Error:", err);
    process.exit(1);
  }
}

init();
