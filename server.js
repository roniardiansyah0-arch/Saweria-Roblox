const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// WEBHOOK DARI SAWERIA
app.post('/webhook', async (req, res) => {
    console.log("Webhook masuk:", req.body);
    
    try {
        const body = req.body;
        const donatorRaw = (body.donator || body.donator_name || body.donatorName || "").trim();
        const messageRaw = (body.message || body.msg || "").trim();
        const amountRaw = body.amount_raw || body.amount || body.nominal || 0;
        
        // Bersihin nominal "Rp 1.000" jadi 1000
        let amount = parseInt(String(amountRaw).replace(/[^0-9]/g, '')) || 0;
        if (amount === 0) amount = 1000;

        // LOGIC CARI USERNAME ROBLOX
        let robloxName = "";
        if (/^[A-Za-z0-9_]{3,20}$/.test(messageRaw)) {
            // Kalau pesan cuma 1 kata = itu username
            robloxName = messageRaw;
        } else if (messageRaw.includes("@")) {
            // Kalau ada @Ronnsyh di pesan
            const m = messageRaw.match(/@([A-Za-z0-9_]{3,20})/);
            if (m) robloxName = m[1];
        }
        
        // Kalau masih kosong, pake nama donatur
        if (!robloxName) {
            robloxName = donatorRaw.replace(/[^A-Za-z0-9_]/g, '').substring(0, 20);
        }

        if (!robloxName) return res.status(200).send("no name");

        console.log(`-> Donasi valid: ${robloxName} Rp ${amount} (dari ${donatorRaw} | pesan: ${messageRaw})`);

        await supabase.from('donations').insert([{
            name: robloxName,
            amount: amount,
            message: robloxName
        }]);

        res.status(200).send("ok");
    } catch (e) {
        console.error(e);
        res.status(200).send("error but ok");
    }
});

// BUAT ROBLOX BACA
app.get('/topcash', async (req, res) => {
    const { data, error } = await supabase
        .from('donations')
        .select('name, amount');

    if (error) return res.json([]);

    // Group by name & sum
    const grouped = {};
    data.forEach(d => {
        const name = d.name;
        if (!grouped[name]) grouped[name] = 0;
        grouped[name] += d.amount;
    });

    const sorted = Object.entries(grouped)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

    res.json(sorted);
});

app.get('/', (req, res) => res.send('Saweria Roblox Active'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server jalan di ${PORT}`));