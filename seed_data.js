const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'agroharvest',
  password: 'Charle@77',
  port: 5432,
});

async function seed() {
  try {
    const client = await pool.connect();
    
    console.log("Seeding data...");

    // 1. Seed Users
    await client.query(`
      INSERT INTO users (name, email, password, role, district) 
      VALUES 
      ('Pawan Agros', 'pawan@dealer.com', 'password123', 'dealer', 'Kathmandu'),
      ('Ram Farmer', 'ram@farmer.com', 'password123', 'farmer', 'Bhaktapur'),
      ('Sita Customer', 'sita@customer.com', 'password123', 'customer', 'Lalitpur'),
      ('Hari Agent', 'hari@agent.com', 'password123', 'agent', 'Kathmandu')
      ON CONFLICT (email) DO NOTHING
    `);

    // 2. Seed Products
    await client.query(`
      INSERT INTO products (name, yield, price, harvest_date, image, status, farmer_name, category)
      VALUES 
      ('Sonalika RX 45 Tractor', '2 Units', 1800000.00, '2026-04-01', null, 'Available', 'Pawan Agros', 'Machinery'),
      ('Organic Rice', '500 kg', 120.00, '2026-03-15', null, 'Available', 'Ram Farmer', 'Food'),
      ('Manual Seed Drill', '10 Units', 4500.00, '2026-04-05', null, 'Available', 'Pawan Agros', 'Tools')
    `);

    // 3. Seed Orders
    await client.query(`
      INSERT INTO orders (customer_name, items, total, address, status, farmer_name)
      VALUES 
      ('Sita Customer', '[{"id": 1, "name": "Sonalika RX 45 Tractor", "qty": 1, "price": 1800000, "farmerName": "Pawan Agros"}]', 1800150.00, 'Lalitpur, Nepal', 'Processing', 'Pawan Agros')
    `);

    console.log("Seeding completed successfully!");
    client.release();
    process.exit(0);
  } catch (err) {
    console.error("Seeding Error:", err.message);
    process.exit(1);
  }
}

seed();
