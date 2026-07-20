require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

app.get("/", (req, res) => res.send("Saweria Server Berjalan!"));
app.get("/webhook", (req, res) => res.send("Webhook aktif!"));

// WEBHOOK - support /webhook dan /webhook/saweria biar gak salah
app.post(["/webhook", "/webhook/saweria"], async (req, res) => {
    console.log("========== DONASI MASUK ==========");
    console.log(JSON.stringify(req.body, null, 2));

    const donation = req.body;
    if (donation.id === "00000000-0000-0000-0000-000000000000" || donation.donator_name === "Someguy") {
        return res.status(200).send("OK Test");
    }

    const { error } = await supabase.from("donations").insert([{
        name: donation.donator_name || "Anonymous",
        amount: donation.amount_raw || 0,
        message: donation.message || ""
    }]);

    if (error) return res.status(500).send("Database Error");
    console.log("Masuk Supabase ✅");
    res.status(200).send("OK");
});

// INI YANG DIBACA ROBLOX - UDAH DI-FIX JADI TOTAL PER ORANG
app.get("/topcash", async (req, res) => {
    const { data, error } = await supabase.from("donations").select("*").limit(1000);
    if (error) return res.status(500).json(error);

    const grouped = {};
    data.forEach(d => {
        let finalName = d.name || "Anonymous";
        if (d.message) {
            const m = d.message.match(/Username:\s*([a-zA-Z0-9_]+)/i);
            if (m) finalName = m[1];
        }
        grouped[finalName] = (grouped[finalName] || 0) + Number(d.amount || 0);
    });

    const leaderboard = Object.keys(grouped).map(name => ({
        name: name,
        amount: grouped[name]
    })).sort((a,b) => b.amount - a.amount).slice(0, 10);

    res.json(leaderboard);
});

// biar link lama kamu tetep jalan
app.get("/donations", (req,res) => res.redirect("/topcash"));
app.get("/latest", async (req,res) => {
    const { data } = await supabase.from("donations").select("*").order("id",{ascending:false}).limit(1);
    res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di ${PORT}`));