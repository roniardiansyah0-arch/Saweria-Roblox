require("dotenv").config();

const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

// =============================
// SUPABASE
// =============================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// =============================
// HALAMAN UTAMA
// =============================
app.get("/", (req, res) => {
    res.send("Saweria Server Berjalan!");
});

// =============================
// TEST WEBHOOK
// =============================
app.get("/webhook", (req, res) => {
    res.send("Webhook aktif!");
});

// =============================
// WEBHOOK SAWERIA
// =============================
app.post("/webhook", async (req, res) => {

    console.log("========== DONASI MASUK ==========");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("=================================");

    const donation = req.body;

    // Abaikan webhook test Saweria
    if (
        donation.id === "00000000-0000-0000-0000-000000000000" ||
        donation.donator_name === "Someguy"
    ) {
        console.log("Webhook test diterima.");
        return res.status(200).send("OK");
    }

    const { error } = await supabase
        .from("donations")
        .insert([
            {
                name: donation.donator_name || "Anonymous",
                amount: donation.amount_raw || 0,
                message: donation.message || ""
            }
        ]);

    if (error) {
        console.log("SUPABASE ERROR:");
        console.log(error);
        return res.status(500).send("Database Error");
    }

    console.log("Donasi masuk Supabase ✅");

    res.status(200).send("OK");
});

// =============================
// DONASI TERBARU UNTUK ROBLOX
// =============================
app.get("/latest", async (req, res) => {

    const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("id", { ascending: false })
        .limit(1);

    if (error) {
        console.log(error);
        return res.status(500).json(error);
    }

    res.json(data);
});

// =============================
// TOP CASH UNTUK ROBLOX
// =============================
app.get("/topcash", async (req, res) => {

    const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("amount", { ascending: false })
        .limit(10);

    if (error) {
        console.log(error);
        return res.status(500).json(error);
    }

    res.json(data);
});

// =============================
// SERVER
// =============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});