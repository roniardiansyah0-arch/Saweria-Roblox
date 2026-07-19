require("dotenv").config();

const express = require("express");

const app = express();

app.use(express.json());

// Halaman utama
app.get("/", (req, res) => {
    res.send("Saweria Server Berjalan!");
});

// Webhook Saweria
app.post("/webhook", (req, res) => {

    console.log("========== DONASI MASUK ==========");
    console.log(req.body);
    console.log("=================================");

    res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});