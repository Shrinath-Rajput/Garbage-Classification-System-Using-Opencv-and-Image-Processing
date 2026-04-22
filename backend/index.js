const express = require("express");
const multer = require("multer");
const axios = require("axios");
const mysql = require("mysql2");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

const app = express();

// ================== DB ==================
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "shrinath1814",
    database: "garbage"
});

db.connect(err => {
    if (err) console.log("❌ DB Error:", err);
    else console.log("✅ MySQL Connected");
});

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

const upload = multer({ dest: "uploads/" });

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

        // file upload
        if (req.file) {
            filePath = req.file.path;
        }

        // camera base64
        else if (req.body.imageData) {
            const base64Data = req.body.imageData.replace(/^data:image\/jpeg;base64,/, "");
            const fileName = Date.now() + ".jpg";
            filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, base64Data, "base64");
        }

        else {
            return res.send("❌ No image received");
        }

        // send to AI
        const formData = new FormData();
        formData.append("image", fs.createReadStream(filePath));

        const response = await axios.post(
            "http://localhost:5000/predict",
            formData,
            { headers: formData.getHeaders() }
        );

        const data = response.data;

        // save DB
        db.query(
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
    db.query("SELECT * FROM garbage_images ORDER BY id DESC", (err, results) => {
        if (err) return res.send("DB Error");
        res.render("dashboard", { data: results });
    });
});

// ================== RECORDS (CHART DATA) ==================
app.get("/records", (req, res) => {
    db.query("SELECT label, COUNT(*) as count FROM garbage_images GROUP BY label",
    (err, results) => {

        const labels = results.map(r => r.label);
        const counts = results.map(r => r.count);

        res.render("records", { labels, counts });
    });
});

// ================== DELETE ONE ==================
app.get("/delete/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM garbage_images WHERE id = ?", [id], (err) => {
        if (err) return res.send("Delete Error");
        res.redirect("/dashboard");
    });
});

// ================== CLEAR ALL ==================
app.get("/clear", (req, res) => {
    db.query("DELETE FROM garbage_images", (err) => {
        if (err) return res.send("Clear Error");
        res.redirect("/dashboard");
    });
});




// ANALYTICS PAGE
app.get("/analytics", (req, res) => {

    db.query(
        "SELECT label, COUNT(*) as count FROM garbage_images GROUP BY label",
        (err, results) => {

            if (err) {
                console.log(err);
                return res.send("DB Error");
            }

            const labels = results.map(r => r.label);
            const counts = results.map(r => r.count);

            res.render("records", { labels, counts });
        }
    );
});

// ================== SERVER ==================
app.listen(3000, () => {
    console.log("🚀 http://localhost:3000");
});