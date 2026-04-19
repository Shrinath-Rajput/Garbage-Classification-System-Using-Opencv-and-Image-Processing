import cv2
import numpy as np
import mysql.connector
import os
import datetime
import random

# --- MySQL Connection ---
conn = mysql.connector.connect(
    host="localhost",
    user="root",      
    password="shrinath1814",          
    database="garbage"
)
cursor = conn.cursor()

# --- Save folder ---
save_dir = "captured"
os.makedirs(save_dir, exist_ok=True)

# --- Labels (demo AI) ---
labels = ["plastic", "metal", "paper", "glass", "trash"]

# --- Start Camera ---
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Camera open होत नाही")
    exit()

print("🎥 Camera started")
print("👉 ENTER दाब = capture")
print("👉 ESC दाब = exit")

captured_frame = None
detected_type = None

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Frame read error")
        break

    cv2.imshow("Garbage Detection (ENTER to capture)", frame)

    key = cv2.waitKey(1)

    # ESC
    if key == 27:
        break

    # ENTER pressed
    if key == 13:
        captured_frame = frame.copy()

        # 🔥 DEMO AI (random prediction)
        detected_type = random.choice(labels)

        print(f"🧠 Predicted: {detected_type}")
        break

cap.release()
cv2.destroyAllWindows()

# --- Save & Store ---
if captured_frame is not None and detected_type is not None:

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{detected_type}_{timestamp}.jpg"

    save_path = os.path.join(save_dir, filename)
    save_path_abs = os.path.abspath(save_path)

    cv2.imwrite(save_path_abs, captured_frame)

    print(f"💾 Saved: {save_path_abs}")

    # --- Insert into DB ---
    cursor.execute(
        "INSERT INTO garbage_images (file_name, file_path, label) VALUES (%s, %s, %s)",
        (filename, save_path_abs, detected_type)
    )
    conn.commit()

    print("🗄️ Data inserted into DB")

    # --- Show result ---
    cv2.putText(captured_frame, detected_type, (50, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 0), 3)

    cv2.imshow("Result", captured_frame)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

else:
    print("⚠️ No capture")

# --- Close DB ---
cursor.close()
conn.close()