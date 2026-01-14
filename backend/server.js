const express = require('express');
const axios = require('axios');
const cors = require('cors');
const scraper = require('./scraper');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/search', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const isMlEnabled = req.query.ml !== 'false';
        const isGoogleEnabled = req.query.google === 'true';
        console.log(`[Search] 🔎 Query: "${query}" | Stores: ML=${isMlEnabled ? '✅' : '❌'}, Google=${isGoogleEnabled ? '✅' : '❌'}`);

        const data = await scraper.searchProducts(query, req.query);
        res.json(data);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to search products', details: error.message });
    }
});

// Proxy for Mercado Livre Autosuggest
app.get('/autosuggest', async (req, res) => {
    const { q } = req.query;
    console.log(`[Autosuggest] Request for: "${q}"`);

    if (!q) return res.json([]);

    try {
        const mlUrl = `https://http2.mlstatic.com/resources/sites/MLB/autosuggest`;
        // Fetch from Mercado Livre's public API using Axios with Headers to avoid 403
        const response = await axios.get(mlUrl, {
            params: {
                showFilters: true,
                limit: 6,
                api_version: 2,
                q: q
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.mercadolivre.com.br/',
                'Accept': 'application/json'
            }
        });

        const data = response.data;
        // Extract just the suggested queries
        const suggestions = data.suggested_queries ? data.suggested_queries.map(item => item.q) : [];
        console.log(`[Autosuggest] Suggestions found: ${suggestions.length}`);

        res.json(suggestions);
    } catch (error) {
        console.error('Autosuggest error:', error.message);
        res.json([]);
    }
});

// --- ALERT CACHE (Persistent JSON) ---
const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'alerts.db.json');

let activeAlerts = {};

// Load existing alerts on startup
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        activeAlerts = JSON.parse(data);
        console.log(`[Database] 📂 Loaded ${Object.keys(activeAlerts).length} alerts from disk.`);
    } catch (err) {
        console.error("[Database] ❌ Error loading DB:", err);
    }
}

// Helper to save to disk
const saveDb = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(activeAlerts, null, 2));
        console.log("[Database] 💾 Saved to disk.");
    } catch (err) {
        console.error("[Database] ❌ Error saving DB:", err);
    }
};

// 1. Frontend saves alert data here
app.post('/create_alert', (req, res) => {
    try {
        // Generate short ID
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

        // Save ALL properties sent by frontend (including formattedPrice)
        activeAlerts[id] = { ...req.body, createdAt: new Date() };
        saveDb(); // Persist immediately

        console.log(`[Alert] Created ID: ${id} for "${req.body.title}"`);
        res.json({ id });
    } catch (error) {
        console.error("Error creating alert:", error);
        res.status(500).json({ error: "Failed to create alert" });
    }
});

// 1.5. Simulation Route (Decrease Price by 20%)
app.post('/simulate_drop', (req, res) => {
    const { id } = req.body;

    if (activeAlerts[id]) {
        const oldPrice = activeAlerts[id].price;
        const newPrice = oldPrice * 0.8; // 20% discount

        activeAlerts[id].price = newPrice;
        activeAlerts[id].formattedPrice = newPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        activeAlerts[id].simulated = true;
        activeAlerts[id].needs_notification = true; // Flag for Bot

        saveDb();
        console.log(`[Simulation] 📉 Dropped price for ${id}: ${oldPrice} -> ${newPrice}`);
        res.json({ success: true, newPrice });
    } else {
        res.status(404).json({ error: "Alert ID not found" });
    }
});

// 1.6 Register User (Link Alert to Telegram Chat ID)
app.post('/register_user', (req, res) => {
    const { alert_id, chat_id } = req.body;
    if (activeAlerts[alert_id]) {
        // If chat_id not set or different, update it
        if (activeAlerts[alert_id].chat_id !== chat_id) {
            activeAlerts[alert_id].chat_id = chat_id;
            saveDb();
            console.log(`[Link] 🔗 Linked Alert ${alert_id} to Chat ID ${chat_id}`);
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Alert not found" });
    }
});

// 1.7 Pending Notifications (For Bot to Poll)
app.get('/pending_notifications', (req, res) => {
    const pending = Object.entries(activeAlerts)
        .filter(([id, alert]) => alert.needs_notification && alert.chat_id)
        .map(([id, alert]) => ({ id, ...alert }));
    res.json(pending);
});

// 1.8 Mark Notified/Read
app.post('/mark_notified', (req, res) => {
    const { id } = req.body;
    if (activeAlerts[id]) {
        activeAlerts[id].needs_notification = false;
        saveDb();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Alert not found" });
    }
});

// 2. Python Bot reads data here
app.get('/get_alert/:id', (req, res) => {
    const id = req.params.id;
    const alertData = activeAlerts[id];

    if (alertData) {
        res.json(alertData);
    } else {
        res.status(404).json({ error: "Alert not found or expired" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('🚀 SERVER VERSION: 5.0 (with Alert Bridge)');
});
