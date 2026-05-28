const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'agroharvest',
    password: 'Charle@77', 
    port: 5432,
});

async function clearData() {
    try {
        console.log('--- Clearing Database Data ---');
        
        // Truncate tables. Using CASCADE to handle foreign keys if any.
        // We clear products, orders, contracts, and users.
        await pool.query('TRUNCATE TABLE products, orders, contracts, users RESTART IDENTITY CASCADE');
        
        console.log('✅ All data removed successfully from products, orders, contracts, and users tables.');
    } catch (err) {
        console.error('❌ Error clearing database:', err.message);
    } finally {
        await pool.end();
    }
}

clearData();
