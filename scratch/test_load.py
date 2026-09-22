import os
import joblib
import time

print("Starting test_load.py")
t0 = time.time()
path = r"c:\xampp\htdocs\Satelite health detector\backend\models\isolation_forest_model.joblib"
print("File exists:", os.path.exists(path))
try:
    artifact = joblib.load(path)
    print("Loaded in", round(time.time() - t0, 2), "s")
    print("Keys:", list(artifact.keys()))
except Exception as e:
    print("Error:", e)
