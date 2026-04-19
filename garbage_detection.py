import cv2
import numpy as np
import mysql.connector
import os
import datetime
import random

# --- MySQL Connection (UPDATED) ---
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="shrinath1818",
    database="garbage"   # ✅ UPDATED
)
cursor = conn.cursor()

# --- Image Save Folder ---
save_dir = "captured"
os.makedirs(save_dir, exist_ok=True)

# --- Dataset Path (तुझ्या system प्रमाणे) ---
BASE_DIR = r"D:\e drive\Only_Project\Garbage_classification\Garbage classification"

# --- Random image picker ---
def get_random_image(folder):
    try:
        files = os.listdir(folder)
        if files:
            return os.path.join(folder, random.choice(files))
    except:
        pass
    return None

# --- Sample image mapping ---
sample_image_map = {
    "plastic": get_random_image(os.path.join(BASE_DIR, "plastic")),
    "rubber": get_random_image(os.path.join(BASE_DIR, "glass")),
    "wet": get_random_image(os.path.join(BASE_DIR, "trash")),
    "dry": get_random_image(os.path.join(BASE_DIR, "paper"))
}

# --- HSV Color Ranges (FIXED "wet") ---
color_ranges = {
    "plastic": ((100, 150, 0), (140, 255, 255)),
    "rubber": [((0, 100, 100), (10, 255, 255)), ((160, 100, 100), (179, 255, 255))],
    "wet": ((25, 50, 70), (35, 255, 255)),   # ✅ FIXED
    "dry": ((40, 40, 40), (80, 255, 255))
}

# --- Start Camera ---
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Error: Cannot open camera.")
    exit()

print("🎥 Camera opened. Detecting garbage...")

detected_type = None
captured_frame = None

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Failed to read frame.")
        break

    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    for garbage_type, bounds in color_ranges.items():
        if garbage_type == "rubber":
            mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
            for lower, upper in bounds:
                mask += cv2.inRange(hsv, np.array(lower), np.array(upper))
        else:
            mask = cv2.inRange(hsv, np.array(bounds[0]), np.array(bounds[1]))

        if cv2.countNonZero(mask) > 5000:
            detected_type = garbage_type
            captured_frame = frame.copy()

            # 🔲 Draw box
            contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                if cv2.contourArea(cnt) > 5000:
                    x, y, w, h = cv2.boundingRect(cnt)
                    cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                    cv2.putText(frame, detected_type, (x, y-10),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

            print(f"🗑️ Detected: {detected_type}")
            break

    cv2.imshow("Garbage Detection - Press ESC to stop", frame)

    if cv2.waitKey(1) == 27 or detected_type:
        break

cap.release()
cv2.destroyAllWindows()

# --- Save Captured Image ---
if detected_type and captured_frame is not None:
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{detected_type}_{timestamp}.jpg"

    save_path = os.path.join(save_dir, filename)
    save_path_abs = os.path.abspath(save_path)

    cv2.imwrite(save_path_abs, captured_frame)
    print(f"💾 Image saved: {save_path_abs}")

    # --- INSERT INTO NEW TABLE ---
    cursor.execute(
        "INSERT INTO garbage_images (file_name, file_path, label) VALUES (%s, %s, %s)",
        (filename, save_path_abs, detected_type)
    )
    conn.commit()

    # --- Show sample image ---
    sample_path = sample_image_map.get(detected_type)

    if sample_path and os.path.exists(sample_path):
        img = cv2.imread(sample_path)
        if img is not None:
            img = cv2.resize(img, (800, 600))
            cv2.imshow(f"Sample for {detected_type}", img)
            print("🖼️ Showing sample image...")
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        else:
            print("⚠️ Cannot read sample image.")
    else:
        print("⚠️ Sample image not found.")

else:
    print("⚠️ No garbage detected.")

# --- Close DB ---
cursor.close()
conn.close()