const express = require("express");
const multer = require("multer");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

const app = express();

// ================== DB (SQLite) ==================
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
app.use(express.static("public"));

// uploads folder
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer({ dest: uploadDir });

// ================== ROUTES ==================

// HOME
app.get("/", (req, res) => {
    res.render("home");
});

// PREDICT PAGE
app.get("/predict", (req, res) => {
    res.render("index");
});

// ================== PREDICT ==================
app.post("/predict", upload.single("image"), async (req, res) => {
    try {
        let filePath;

        if (req.file) {
            filePath = req.file.path;
        } 
        else if (req.body.imageData) {
            const base64Data = req.body.imageData.replace(/^data:image\/jpeg;base64,/, "");
            const fileName = Date.now() + ".jpg";
            filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, base64Data, "base64");
        } 
        else {
            return res.send("❌ No image received");
        }

        const formData = new FormData();
        formData.append("image", fs.createReadStream(filePath));

        const response = await axios.post(
            "http://127.0.0.1:5000/predict",
            formData,
            { headers: formData.getHeaders() }
        );

        const data = response.data;

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

// ================== DELETE ONE ==================
app.get("/delete/:id", (req, res) => {
    const id = req.params.id;

    db.run("DELETE FROM garbage_images WHERE id = ?", [id], (err) => {
        if (err) return res.send("Delete Error");
        res.redirect("/dashboard");
    });
});

// ================== CLEAR ALL ==================
app.get("/clear", (req, res) => {
    db.run("DELETE FROM garbage_images", (err) => {
        if (err) return res.send("Clear Error");
        res.redirect("/dashboard");
    });
});

// ================== ANALYTICS ==================
app.get("/analytics", (req, res) => {
    db.all("SELECT label, COUNT(*) as count FROM garbage_images GROUP BY label", [], (err, rows) => {

        if (err) {
            console.log(err);
            return res.send("DB Error");
        }

        const labels = rows.map(r => r.label);
        const counts = rows.map(r => r.count);

        res.render("records", { labels, counts });
    });
});

// ================== SERVER ==================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 Server running on port", PORT);
});