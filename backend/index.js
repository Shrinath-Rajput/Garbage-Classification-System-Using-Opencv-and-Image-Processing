const express = require("express");
const multer = require("multer");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

const app = express();

// ================== DB ==================
const db = new sqlite3.Database("garbage.db");

db.run(`
CREATE TABLE IF NOT EXISTS garbage_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    file_path TEXT,
    label TEXT
)
`);

// ================== SETUP ==================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// upload folder
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({ dest: uploadDir });

// 🔥 AI SERVICE URL (CHANGE THIS)
const AI_URL = process.env.AI_URL || "https://YOUR-FLASK-URL/predict";

// ================== ROUTES ==================
app.get("/test", (req, res) => {
    res.send("Server Working ✅");
});

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/predict", (req, res) => {
    res.render("index");
});

app.post("/predict", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) return res.send("No file");

        const formData = new FormData();
        formData.append("image", fs.createReadStream(req.file.path));

        const response = await axios.post(AI_URL, formData, {
            headers: formData.getHeaders()
        });

        const data = response.data;

        db.run(
            "INSERT INTO garbage_images (file_name, file_path, label) VALUES (?, ?, ?)",
            [data.file_name, data.file_path, data.label]
        );

        res.render("result", { result: data });

    } catch (err) {
        console.log(err.message);
        res.send("Error: " + err.message);
    }
});

app.get("/dashboard", (req, res) => {
    db.all("SELECT * FROM garbage_images ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.send("DB Error");
        res.render("dashboard", { data: rows });
    });
});

app.get("/records", (req, res) => {
    db.all("SELECT label, COUNT(*) as count FROM garbage_images GROUP BY label", [], (err, rows) => {
        const labels = rows.map(r => r.label);
        const counts = rows.map(r => r.count);

        res.render("records", { labels, counts });
    });
});

app.get("/delete/:id", (req, res) => {
    db.run("DELETE FROM garbage_images WHERE id = ?", [req.params.id], () => {
        res.redirect("/dashboard");
    });
});

app.get("/clear", (req, res) => {
    db.run("DELETE FROM garbage_images", () => {
        res.redirect("/dashboard");
    });
});

// ================== SERVER ==================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 Server running on port", PORT);
});