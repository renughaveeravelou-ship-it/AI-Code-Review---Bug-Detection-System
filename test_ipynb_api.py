import requests
import json

url = "http://127.0.0.1:8000/analyze"
with open("test_notebook.ipynb", "rb") as f:
    files = {"file": f}
    response = requests.post(url, files=files)

print("Status Code:", response.status_code)
if response.status_code == 200:
    res_data = response.json()
    print("Analyzed Code:")
    print(res_data.get("analyzed_code"))
    print("\nSummary:")
    print(json.dumps(res_data.get("summary"), indent=2))
    print("\nBandit Report:")
    print(res_data.get("security_analysis", {}).get("report"))
else:
    print(response.text)
