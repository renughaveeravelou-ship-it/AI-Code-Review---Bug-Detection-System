import requests

# Create a sample Python file to test
test_code = """
def calculate_area(radius):
    pi = 3.14
    return pi * radius * radius
"""

with open("sample_test_code.py", "w") as f:
    f.write(test_code)

url = "http://127.0.0.1:8000/analyze"
with open("sample_test_code.py", "rb") as f:
    files = {"file": f}
    response = requests.post(url, files=files)

print("Status Code:", response.status_code)
import json
print("Response Body:")
print(json.dumps(response.json(), indent=2))
