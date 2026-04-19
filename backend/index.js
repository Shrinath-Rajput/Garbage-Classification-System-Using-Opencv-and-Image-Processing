const express = require("express");
const multer = require("multer");
const axios = require("axios");
const mysql = require("mysql2");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

const app = express();

// DB
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "shrinath1814",
    database: "garbage"
});

db.connect(err => {
    if (err) console.log(err);
    else console.log("MySQL Connected");
});

// setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// ROUTES

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/predict", (req, res) => {
    res.render("index");
});

app.post("/predict", upload.single("image"), async (req, res) => {
    try {
        const formData = new FormData();
        formData.append("image", fs.createReadStream(req.file.path));

        const response = await axios.post("http://localhost:5000/predict", formData, {
            headers: formData.getHeaders()
        });

        const data = response.data;

        db.query(
            "INSERT INTO garbage_images (file_name, file_path, label) VALUES (?, ?, ?)",
            [data.file_name, data.file_path, data.label]
        );

        res.render("result", { result: data });

    } catch (err) {
        res.send(err.message);
    }
});

app.get("/dashboard", (req, res) => {
    db.query("SELECT * FROM garbage_images ORDER BY id DESC", (err, results) => {
        res.render("dashboard", { data: results });
    });
});

app.get("/records", (req, res) => {
    db.query("SELECT * FROM garbage_images ORDER BY id DESC", (err, results) => {
        res.render("records", { data: results });
    });
});

app.listen(3000, () => console.log("http://localhost:3000"));