import urllib.request
try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as response:
        print("Backend Status:", response.read().decode())
except Exception as e:
    print("Backend check:", e)

try:
    with urllib.request.urlopen("http://localhost:5173/") as response:
        print("Frontend Vite Status Code:", response.getcode())
        content = response.read().decode()
        print("Frontend HTML head length:", len(content))
except Exception as e:
    print("Frontend check:", e)
