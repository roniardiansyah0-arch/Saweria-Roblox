require("dotenv").config();

const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.json());

const DATA_FILE = "./donations.json";

// =============================
// LOAD DATA DONASI
// =============================
function loadDonations() {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }

    const data = fs.readFileSync(DATA_FILE, "utf8");

    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
}


// =============================
// SAVE DATA DONASI
// =============================
function saveDonations(data) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );
}


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
app.post("/webhook", (req, res) => {

    console.log("========== DONASI MASUK ==========");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("=================================");


    const donation = req.body;


    const data = loadDonations();


    data.push({
        name: donation.donator_name || "Anonymous",
        amount: donation.amount_raw || 0,
        message: donation.message || "",
        date: new Date().toISOString()
    });


    saveDonations(data);


    console.log("Donasi tersimpan!");

    res.status(200).send("OK");
});


// =============================
// TOP CASH UNTUK ROBLOX
// =============================
app.get("/topcash", (req, res) => {

    const data = loadDonations();


    const ranking = data
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);


    res.json(ranking);
});


// =============================
// SERVER
// =============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});