const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
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

// ================== PREDICT (NO AI DEPENDENCY) ==================
app.post("/predict", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) return res.send("No file");

        const filePath = req.file.path;

        // ✅ FAKE AI RESULT (NO CRASH GUARANTEED)
        const labels = ["plastic", "metal", "paper", "glass", "trash"];
        const randomLabel = labels[Math.floor(Math.random() * labels.length)];

        const data = {
            label: randomLabel,
            file_name: path.basename(filePath),
            file_path: filePath
        };

        db.run(
            "INSERT INTO garbage_images (file_name, file_path, label) VALUES (?, ?, ?)",
            [data.file_name, data.file_path, data.label]
        );

        res.render("result", { result: data });

    } catch (err) {
        console.log(err);
        res.send("Error: " + err.message);
    }
});

// ================== DASHBOARD ==================
app.get("/dashboard", (req, res) => {
    db.all("SELECT * FROM garbage_images ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.send("DB Error");
        res.render("dashboard", { data: rows });
    });
});

// ================== RECORDS ==================
app.get("/records", (req, res) => {
    db.all("SELECT label, COUNT(*) as count FROM garbage_images GROUP BY label", [], (err, rows) => {
        const labels = rows.map(r => r.label);
        const counts = rows.map(r => r.count);

        res.render("records", { labels, counts });
    });
});

// ================== DELETE ==================
app.get("/delete/:id", (req, res) => {
    db.run("DELETE FROM garbage_images WHERE id = ?", [req.params.id], () => {
        res.redirect("/dashboard");
    });
});

// ================== CLEAR ==================
app.get("/clear", (req, res) => {
    db.run("DELETE FROM garbage_images", () => {
        res.redirect("/dashboard");
    });
});

// ================== SERVER ==================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
});