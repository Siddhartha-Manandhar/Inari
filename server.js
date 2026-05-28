const express = require('express');
const path = require('path');
const http = require('http');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const port = 8080;

// ─── WebSocket (ws) ────────────────────────────────────────────────────────
let wss = null;
const userConnections = new Map(); // userName → ws
try {
    const { WebSocketServer } = require('ws');
    wss = new WebSocketServer({ server });
    const clients = new Set();
    wss.on('connection', (ws) => {
        clients.add(ws);
        let registeredName = null;
        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw);
                if (msg.type === 'REGISTER' && msg.userName) {
                    registeredName = msg.userName;
                    userConnections.set(registeredName, ws);
                }
            } catch (e) {}
        });
        ws.on('close', () => {
            clients.delete(ws);
            if (registeredName) userConnections.delete(registeredName);
        });
    });
    // Broadcast to all connected clients
    app.locals.broadcast = (data) => {
        const msg = JSON.stringify(data);
        clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
    };
    // Send to a specific user
    app.locals.sendToUser = (userName, data) => {
        const ws = userConnections.get(userName);
        if (ws && ws.readyState === 1) ws.send(JSON.stringify(data));
    };
    console.log('✅ WebSocket server ready');
} catch (e) {
    console.warn('⚠️  ws package not found – notifications disabled. Run: npm install ws');
    app.locals.broadcast = () => {};
    app.locals.sendToUser = () => {};
}

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'agroharvest',
    password: 'Charle@77', 
    port: 5432,
});

app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} | ${req.method} ${req.url}`);
    next();
});

// ─── AUTO-INIT DB TABLES ───────────────────────────────────────────────────
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id            SERIAL PRIMARY KEY,
                sender_name   VARCHAR(255) NOT NULL,
                sender_role   VARCHAR(50)  NOT NULL,
                receiver_name VARCHAR(255) NOT NULL,
                receiver_role VARCHAR(50)  NOT NULL,
                message       TEXT         NOT NULL,
                read          BOOLEAN      DEFAULT FALSE,
                created_at    TIMESTAMP    DEFAULT NOW()
            )
        `);
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'agent'`);
        console.log('✅ DB tables ready');
    } catch (err) {
        console.error('DB init error:', err.message);
    }
})();


// ─── MARKET DATA PROXY ─────────────────────────────────────────────────────
const https = require('https');

const MARKET_FALLBACK = [
    { name: 'Tomato (Golbheda)',      min: '20', max: '40',  avg: '30'  },
    { name: 'Potato (Alu)',           min: '25', max: '45',  avg: '35'  },
    { name: 'Onion (Pyaj)',           min: '30', max: '55',  avg: '42'  },
    { name: 'Cauliflower (Kauli)',    min: '30', max: '60',  avg: '45'  },
    { name: 'Cabbage (Banda Govi)',   min: '15', max: '30',  avg: '22'  },
    { name: 'Carrot (Gajar)',         min: '40', max: '70',  avg: '55'  },
    { name: 'Spinach (Palungo)',      min: '20', max: '40',  avg: '30'  },
    { name: 'Radish (Mullo)',         min: '10', max: '25',  avg: '18'  },
    { name: 'Eggplant (Bhanta)',      min: '20', max: '45',  avg: '32'  },
    { name: 'Pumpkin (Pharsi)',       min: '15', max: '30',  avg: '22'  },
    { name: 'Coriander (Dhania)',     min: '50', max: '100', avg: '75'  },
    { name: 'Ginger (Aduwa)',        min: '60', max: '120', avg: '90'  },
];

let marketCache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000;

app.get('/api/market-data', (req, res) => {
    if (marketCache.data && (Date.now() - marketCache.timestamp) < CACHE_TTL_MS) {
        return res.json(marketCache.data);
    }
    let responseSent = false;
    const fetchTimeout = setTimeout(() => {
        if (!responseSent) {
            responseSent = true;
            res.json(marketCache.data || MARKET_FALLBACK);
        }
    }, 8000);
    https.get('https://kalimatimarket.gov.np/api/daily-prices/en', (externalRes) => {
        let raw = '';
        externalRes.on('data', (chunk) => raw += chunk);
        externalRes.on('end', () => {
            clearTimeout(fetchTimeout);
            if (responseSent) return;
            try {
                const json = JSON.parse(raw);
                const prices = json.prices || [];
                const results = prices.map(p => ({
                    name: p.commodityname, min: p.minprice, max: p.maxprice, avg: p.avgprice
                })).slice(0, 40);
                marketCache = { data: results, timestamp: Date.now() };
                responseSent = true;
                res.json(results);
            } catch (e) {
                if (!responseSent) { responseSent = true; res.json(marketCache.data || MARKET_FALLBACK); }
            }
        });
    }).on('error', (err) => {
        clearTimeout(fetchTimeout);
        if (!responseSent) { responseSent = true; res.json(marketCache.data || MARKET_FALLBACK); }
    });
});

// ─── AUTH API ──────────────────────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
    const { name, email, password, role, district } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (name, email, password, role, district) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, role, district',
            [name, email, password, role, district]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error("Signup DB Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, district FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── PRODUCTS API ──────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { name, yield: yieldVal, price, date, farmerName, image, category } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (name, yield, price, harvest_date, image, status, farmer_name, category) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [name, yieldVal, price, date, image, 'Available', farmerName, category]
        );
        res.json({ success: true, product: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── DELIVERY STATUS WORKFLOW ──────────────────────────────────────────────
// Allowed status transitions per role
const TRANSITIONS = {
    farmer: {
        'Order Placed':    'Order Accepted',
        'Order Accepted':  'Preparing Order',
        'Preparing Order': 'Ready for Pickup',
        'Ready for Pickup':'Handed Over to Delivery Agent',
    },
    // Farmer self-delivers (direct, no agent)
    farmer_direct: {
        'Order Placed':    'Order Accepted',
        'Order Accepted':  'Preparing Order',
        'Preparing Order': 'Ready for Pickup',
        'Ready for Pickup':'Out for Delivery',
        'Out for Delivery':'Delivered',
    },
    agent: {
        'Handed Over to Delivery Agent': 'Out for Delivery',
        'Out for Delivery':              'Delivered',
    }
};

// Statuses where the Agent can self-assign
const AGENT_PICKUP_STATUSES = ['Handed Over to Delivery Agent'];

// Helper: record history entry
async function logHistory(client, orderId, status, changedBy, changedByRole, note) {
    await client.query(
        'INSERT INTO delivery_status_history (order_id, status, changed_by, changed_by_role, note) VALUES ($1,$2,$3,$4,$5)',
        [orderId, status, changedBy, changedByRole, note || null]
    );
}

// GET delivery timeline for an order
app.get('/api/orders/:id/timeline', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (order.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
        const history = await pool.query(
            'SELECT * FROM delivery_status_history WHERE order_id = $1 ORDER BY created_at ASC',
            [id]
        );
        res.json({ order: order.rows[0], timeline: history.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST update delivery status (role-enforced)
app.post('/api/orders/:id/delivery-status', async (req, res) => {
    const { id } = req.params;
    const { newStatus, changedBy, changedByRole, note } = req.body;

    if (!newStatus || !changedBy || !changedByRole) {
        return res.status(400).json({ success: false, error: 'newStatus, changedBy, changedByRole are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
        if (orderRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        const order = orderRes.rows[0];
        const currentStatus = order.status;

        // Choose transition map — farmer_direct if delivery_type = 'direct'
        const roleKey = (changedByRole === 'farmer' && order.delivery_type === 'direct')
            ? 'farmer_direct' : changedByRole;
        const allowed = TRANSITIONS[roleKey];
        if (!allowed) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, error: `Role '${changedByRole}' cannot update delivery status` });
        }
        if (allowed[currentStatus] !== newStatus) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                success: false,
                error: `Invalid transition: '${currentStatus}' → '${newStatus}' for role '${changedByRole}'`
            });
        }

        // Update agent name when agent picks up
        let agentName = order.delivery_agent;
        if (changedByRole === 'agent' && AGENT_PICKUP_STATUSES.includes(currentStatus)) {
            agentName = changedBy;
        }

        // Update the order
        const updated = await client.query(
            `UPDATE orders SET status=$1, delivery_agent=COALESCE($2, delivery_agent), updated_at=NOW() WHERE id=$3 RETURNING *`,
            [newStatus, agentName, id]
        );

        // Record history
        await logHistory(client, id, newStatus, changedBy, changedByRole, note);

        // When Delivered: no stock change needed (already deducted on order placement)
        // This block is kept for legacy orders placed before the fix
        if (newStatus === 'Delivered') {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            // Only deduct if stock wasn't already deducted (backward compat check via a flag isn't available, so skip to avoid double-deduction)
        }

        await client.query('COMMIT');

        // Broadcast via WebSocket
        req.app.locals.broadcast({
            type: 'STATUS_UPDATE',
            orderId: parseInt(id),
            newStatus,
            changedBy,
            changedByRole,
            customerName: order.customer_name,
            farmerName: order.farmer_name,
            agentName,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, order: updated.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delivery status update error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

// ─── ORDERS API ────────────────────────────────────────────────────────────
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders/farmer/:farmerName', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM orders WHERE farmer_name = $1 ORDER BY id DESC`,
            [req.params.farmerName]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders/customer/:customerName', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM orders WHERE customer_name = $1 ORDER BY id DESC',
            [req.params.customerName]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const { customerName, customerId, items, total, address, farmerName, deliveryType } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── Step 1: Validate stock availability for each item ──
        for (const item of (items || [])) {
            const prod = await client.query('SELECT id, yield, name FROM products WHERE id = $1 FOR UPDATE', [item.id]);
            if (prod.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(422).json({ success: false, error: `Product not found (id=${item.id})` });
            }
            const availableKg = parseFloat(prod.rows[0].yield) || 0;
            const requestedKg = parseFloat(item.qty) || 0;
            if (requestedKg > availableKg) {
                await client.query('ROLLBACK');
                return res.status(422).json({
                    success: false,
                    error: `Insufficient stock for "${prod.rows[0].name}". Available: ${availableKg} kg, Requested: ${requestedKg} kg.`
                });
            }
        }

        // ── Step 2: Insert the order (with delivery_type) ──
        const result = await client.query(
            'INSERT INTO orders (customer_name, customer_id, items, total, address, status, farmer_name, delivery_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [customerName, customerId || null, JSON.stringify(items), total, address, 'Order Placed', farmerName || null, deliveryType || 'agent']
        );
        const order = result.rows[0];
        await logHistory(client, order.id, 'Order Placed', customerName, 'customer', 'Order placed by customer');

        // ── Step 3: Immediately deduct stock ──
        for (const item of (items || [])) {
            try {
                const prod = await client.query('SELECT id, yield FROM products WHERE id = $1', [item.id]);
                if (prod.rowCount > 0) {
                    const current = parseFloat(prod.rows[0].yield) || 0;
                    const newYield = Math.max(0, current - (parseFloat(item.qty) || 0));
                    const newStatus = newYield <= 0 ? 'Sold' : 'Available';
                    await client.query(
                        'UPDATE products SET yield = $1, status = $2 WHERE id = $3',
                        [`${newYield} kg`, newStatus, item.id]
                    );
                }
            } catch (e) { console.error(`[STOCK ERR] item ${item.id}:`, e.message); }
        }

        await client.query('COMMIT');
        res.json({ success: true, order });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Order error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});


// Legacy accept endpoint (Farmer accepts → "Order Accepted")
app.post('/api/orders/:id/accept', async (req, res) => {
    const { id } = req.params;
    const { farmerName } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const orderRes = await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [id]);
        if (orderRes.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: 'Order not found' }); }
        const result = await client.query(
            `UPDATE orders SET status='Order Accepted', farmer_name=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
            [farmerName, id]
        );
        await logHistory(client, id, 'Order Accepted', farmerName, 'farmer', 'Farmer accepted the order');
        await client.query('COMMIT');
        req.app.locals.broadcast({ type: 'STATUS_UPDATE', orderId: parseInt(id), newStatus: 'Order Accepted', changedBy: farmerName });
        res.json({ success: true, order: result.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

// Legacy status update (kept for backward compat, maps old statuses)
app.post('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, agentName } = req.body;

    // Map legacy statuses to new ones
    const legacyMap = {
        'Processing':  'Order Placed',
        'Accepted':    'Order Accepted',
        'In Transit':  'Out for Delivery',
        'Delivered':   'Delivered',
        'Cancelled':   'Cancelled',
    };
    const mappedStatus = legacyMap[status] || status;

    try {
        const result = await pool.query(
            `UPDATE orders SET status=$1, delivery_agent=COALESCE($2, delivery_agent), updated_at=NOW() WHERE id=$3 RETURNING *`,
            [mappedStatus, agentName || null, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Order not found' });

        if (mappedStatus === 'Delivered') {
            const order = result.rows[0];
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            for (const item of (items || [])) {
                try {
                    const prod = await pool.query('SELECT id, yield FROM products WHERE id = $1', [item.id]);
                    if (prod.rowCount > 0) {
                        const current = parseFloat(prod.rows[0].yield) || 0;
                        const newYield = Math.max(0, current - (item.qty || 0));
                        await pool.query('UPDATE products SET yield=$1, status=$2 WHERE id=$3',
                            [`${newYield} kg`, newYield <= 0 ? 'Sold' : 'Available', item.id]);
                    }
                } catch (e) { console.error(`[YIELD ERR]`, e.message); }
            }
        }
        req.app.locals.broadcast({ type: 'STATUS_UPDATE', orderId: parseInt(id), newStatus: mappedStatus });
        res.json({ success: true, order: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── USERS API (for chat partner selection) ────────────────────────────────
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, role FROM users ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── MESSAGES (CHAT) API ───────────────────────────────────────────────────
// Send a message
app.post('/api/messages', async (req, res) => {
    const { senderName, senderRole, receiverName, receiverRole, message } = req.body;
    if (!senderName || !receiverName || !message) {
        return res.status(400).json({ success: false, error: 'senderName, receiverName, message are required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO messages (sender_name, sender_role, receiver_name, receiver_role, message) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [senderName, senderRole || 'unknown', receiverName, receiverRole || 'unknown', message]
        );
        const msg = result.rows[0];
        // Real-time push to receiver
        req.app.locals.sendToUser(receiverName, { type: 'NEW_MESSAGE', message: msg });
        res.json({ success: true, message: msg });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get conversation thread between two users
app.get('/api/messages/:userA/:userB', async (req, res) => {
    const { userA, userB } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM messages
             WHERE (sender_name=$1 AND receiver_name=$2) OR (sender_name=$2 AND receiver_name=$1)
             ORDER BY created_at ASC`,
            [userA, userB]
        );
        // Mark messages to userA from userB as read
        await pool.query(
            `UPDATE messages SET read=true WHERE receiver_name=$1 AND sender_name=$2 AND read=false`,
            [userA, userB]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all conversations (latest msg per partner) for a user
app.get('/api/messages/conversations/:userName', async (req, res) => {
    const { userName } = req.params;
    try {
        const result = await pool.query(
            `SELECT DISTINCT ON (partner)
                CASE WHEN sender_name=$1 THEN receiver_name ELSE sender_name END AS partner,
                CASE WHEN sender_name=$1 THEN receiver_role ELSE sender_role END AS partner_role,
                message, created_at, read, sender_name,
                (
                    SELECT COUNT(*) FROM messages
                    WHERE receiver_name=$1
                    AND sender_name = CASE WHEN m.sender_name=$1 THEN m.receiver_name ELSE m.sender_name END
                    AND read=false
                ) AS unread_count
             FROM messages m
             WHERE sender_name=$1 OR receiver_name=$1
             ORDER BY partner, created_at DESC`,
            [userName]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unread message count for a user
app.get('/api/messages/unread/:userName', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) FROM messages WHERE receiver_name=$1 AND read=false',
            [req.params.userName]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── EARNINGS API ──────────────────────────────────────────────────────────
app.get('/api/earnings/:farmerName', async (req, res) => {
    try {
        const orders = await pool.query(
            `SELECT * FROM orders WHERE farmer_name = $1 ORDER BY created_at DESC`,
            [req.params.farmerName]
        );
        const delivered = orders.rows.filter(o => o.status === 'Delivered');
        const pending = orders.rows.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
        res.json({
            totalRevenue: delivered.reduce((s, o) => s + parseFloat(o.total), 0),
            pendingAmount: pending.reduce((s, o) => s + parseFloat(o.total), 0),
            deliveredCount: delivered.length,
            pendingCount: pending.length,
            recentOrders: orders.rows.slice(0, 10)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── CONTRACTS API ─────────────────────────────────────────────────────────
app.get('/api/contracts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contracts ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contracts', async (req, res) => {
    const { crop, qty, date, customerName } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO contracts (crop, qty, delivery_date, customer_name, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [crop, qty, date, customerName, 'Pending']
        );
        res.json({ success: true, contract: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/contracts/accept', async (req, res) => {
    const { id, farmerName } = req.body;
    try {
        const result = await pool.query(
            "UPDATE contracts SET status='Accepted', farmer_name=$1 WHERE id=$2 RETURNING *",
            [farmerName, id]
        );
        res.json({ success: true, contract: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/contracts/cancel/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM contracts WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Contract not found" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── STATIC & ROUTES ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/signin', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'signin.html')); });
app.get('/signup', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'signup.html')); });
app.get('/dashboard', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dashboard.html')); });
app.get('/marketplace', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'marketplace.html')); });

server.listen(port, () => {
    console.log(`✅ AgroHarvest Server running at http://localhost:${port}`);
});
