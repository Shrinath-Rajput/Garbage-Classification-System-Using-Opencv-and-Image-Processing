from flask import Flask, request, jsonify, send_from_directory
import os, random, datetime

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

labels = ["plastic", "metal", "paper", "glass", "trash"]

@app.route("/")
def home():
    return "AI Service Running 🚀"

@app.route("/predict", methods=["POST"])
def predict():
    file = request.files["image"]

    filename = datetime.datetime.now().strftime("%Y%m%d%H%M%S") + ".jpg"
    path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(path)

    label = random.choice(labels)

    return jsonify({
        "label": label,
        "file_name": filename,
        "file_path": "uploads/" + filename
    })

@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    app.run(port=5000, debug=True)