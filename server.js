const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.post('/webhook', async (req, res) => {
    console.log("Webhook masuk:", req.body);
    try {
        const body = req.body;
        const donatorRaw = (body.donator || body.donator_name || body.donatorName || "").trim();
        const messageRaw = (body.message || body.msg || "").trim();
        const amountRaw = body.amount_raw || body.amount || body.nominal || 0;

        let amount = parseInt(String(amountRaw).replace(/[^0-9]/g, '')) || 0;
        if (amount === 0) amount = 1000;

        let robloxName = "";
        let cleanMessage = messageRaw;

        if (messageRaw.includes("@")) {
            const m = messageRaw.match(/@([A-Za-z0-9_]{3,20})/);
            if (m) {
                robloxName = m[1];
                cleanMessage = messageRaw.replace(m[0], "").trim();
            }
        }
        if (!robloxName && /^[A-Za-z0-9_]{3,20}$/.test(messageRaw)) {
            robloxName = messageRaw;
            cleanMessage = "";
        }
        if (!robloxName) {
            robloxName = donatorRaw.replace(/[^A-Za-z0-9_]/g, '').substring(0, 20);
        }
        if (!robloxName) return res.status(200).send("no name");

        console.log(`-> Donasi valid: ${robloxName} Rp ${amount} | pesan: "${cleanMessage}"`);

        const { data: inserted, error: insertError } = await supabase
          .from('donations')
          .insert([{
                name: robloxName,
                amount: amount,
                message: cleanMessage
            }])
          .select();

        if (insertError) {
            console.error("INSERT ERROR:", insertError);
            return res.status(200).send("insert error");
        }

        console.log("INSERT OK:", inserted);
        res.status(200).send("ok");
    } catch (e) {
        console.error(e);
        res.status(200).send("error but ok");
    }
});

app.get('/topcash', async (req, res) => {
    const { data, error } = await supabase
     .from('donations')
     .select('name, amount, message, created_at')
     .order('created_at', { ascending: false })
     .limit(1000);

    if (error) {
        console.error("TOPCASH ERROR:", error);
        return res.json([]);
    }

    const grouped = {};
    data.forEach(d => {
        if (!grouped[d.name]) {
            grouped[d.name] = { amount: 0, message: d.message, last_at: d.created_at };
        }
        grouped[d.name].amount += d.amount;
    });

    const sorted = Object.entries(grouped)
     .map(([name, v]) => ({ name, amount: v.amount, message: v.message, last_at: v.last_at }))
     .sort((a, b) => b.amount - a.amount)
     .slice(0, 10);

    res.json(sorted);
});

app.get('/latest', async (req, res) => {
    const { data, error } = await supabase
     .from('donations')
     .select('*')
     .order('created_at', { ascending: false })
     .limit(5);
    if (error) console.error("LATEST ERROR:", error);
    res.json(data || []);
});

app.get('/', (req, res) => res.send('Saweria Roblox Active - Ronnsyh V7 FIX'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server jalan di ${PORT}`));