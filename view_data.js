const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'agroharvest',
  password: 'Charle@77', // UPDATE THIS
  port: 5432,
});

async function viewData() {
  try {
    const client = await pool.connect();

    console.log("\n=== USERS LEDGER ===");
    const users = await client.query("SELECT id, name, email, role, district FROM users");
    console.table(users.rows);

    console.log("\n=== HARVEST PRODUCTS ===");
    const products = await client.query("SELECT id, name, yield, price, status, farmer_name FROM products");
    console.table(products.rows);

    console.log("\n=== ACTIVE CONTRACTS ===");
    const contracts = await client.query("SELECT id, crop, qty, delivery_date, customer_name, status FROM contracts");
    console.table(contracts.rows);

    client.release();
    process.exit(0);
  } catch (err) {
    console.error("Error viewing data:", err.message);
    process.exit(1);
  }
}

viewData();
