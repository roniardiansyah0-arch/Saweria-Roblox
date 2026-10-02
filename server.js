const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function getOwner(req) {
  let u = (req.query?.user || req.body?.user || 'ronnsyh').toString().toLowerCase().trim();
  return u || 'ronnsyh';
}

// AUTO RETRY KALO KENA PGRST303
async function supabaseRetry(queryFn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        const { data, error } = await queryFn();
        if (!error) return { data, error: null };
        if (error.code === 'PGRST303' && i < retries - 1) {
            console.log(`Clock skew PGRST303, retry ${i+1}/${retries}...`);
            await new Promise(r => setTimeout(r, 1500));
            continue;
        }
        return { data, error };
    }
}

app.post('/webhook', async (req, res) => {
    console.log("Webhook masuk:", req.body, "OWNER:", getOwner(req));
    try {
        const owner = getOwner(req);
        const body = req.body;
        const donatorRaw = (body.donator || body.donator_name || body.donatorName || "").trim();
        const messageRaw = (body.message || body.msg || "").trim();
        const amountRaw = body.amount_raw || body.amount || body.nominal || 0;

        let amount = parseInt(String(amountRaw).replace(/[^0-9]/g, ''), 10) || 0;
        if (amount === 0) amount = 1000; // 1000 tetap kehitung

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
            // JANGAN return no name, pakai Unknown biar tetap masuk DB
            robloxName = donatorRaw.replace(/[^A-Za-z0-9_]/g,'').substring(0,20) || "Unknown";
        }

        const saweria_id = (body.id || `SAW_${Date.now()}_${Math.random()}`).toString();

        console.log(`-> [${owner}] Donasi valid: ${robloxName} Rp ${amount} | pesan: "${cleanMessage}"`);

        const { data: inserted, error: insertError } = await supabaseRetry(() =>
            supabase.from('donations').insert([{
                name: robloxName,
                amount: amount,
                message: cleanMessage,
                owner: owner,
                saweria_id: saweria_id,
                created_at: new Date().toISOString()
            }]).select()
        );

        if (insertError) {
            if (insertError.code === '23505') return res.status(200).send("duplicate but ok");
            if (insertError.code === 'PGRST303') return res.status(500).send("clock_skew");
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
    const owner = getOwner(req);
    const { data, error } = await supabaseRetry(() =>
        supabase.from('donations').select('name, amount, message, created_at').eq('owner', owner).order('created_at', { ascending: false }).limit(1000)
    );

    if (error) {
        console.error("TOPCASH ERROR:", error);
        return res.status(500).json({ error: error.code || "db_error" });
    }

    const grouped = {};
    data.forEach(d => {
        const key = d.name.toLowerCase();
        if (!grouped[key]) {
            grouped[key] = { name: d.name, amount: 0, message: d.message, last_at: d.created_at };
        }
        grouped[key].amount += d.amount;
        if (new Date(d.created_at) > new Date(grouped[key].last_at)) {
            grouped[key].last_at = d.created_at;
            grouped[key].message = d.message;
        }
    });

    const sorted = Object.values(grouped).sort((a, b) => b.amount - a.amount).slice(0, 20);
    res.json(sorted);
});

app.get('/latest', async (req, res) => {
    const owner = getOwner(req);
    const { data, error } = await supabaseRetry(() =>
        supabase.from('donations').select('*').eq('owner', owner).order('created_at', { ascending: false }).limit(10)
    );
    if (error) {
        console.error("LATEST ERROR:", error);
        return res.status(500).json({ error: error.code || "db_error" });
    }
    res.json(data || []);
});

app.get('/', (req, res) => res.send('WSBI Multi-User Active - Ronnsyh V8 - Owner: ' + getOwner(req)));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server jalan di ${PORT}`));
