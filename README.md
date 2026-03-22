# Key Master - License Management System

A professional dashboard to generate and manage access keys for your applications (Python, Node.js, etc.).

## Features
- **Key Generation:** 1 Day, 1 Week, and Permanent keys.
- **Public API:** Easy integration with any language using simple GET requests.
- **Admin Dashboard:** Secure management of all generated keys.
- **CSV Export:** Export your database for use in Google Sheets or Excel.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Lucide Icons, Motion.
- **Backend:** Express.js (Node.js).
- **Database:** Local JSON storage (keys.json).

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/key-master.git
   cd key-master
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Copy `.env.example` to `.env`.
   - Set your `VITE_ADMIN_PASSWORD` in the `.env` file.

4. **Run the application:**
   - **Development:** `npm run dev`
   - **Production:** `npm run build && npm start`

## API Integration (Python Example)

```python
import requests

def check_license(key):
    url = f"https://your-app-url.com/api/validate/{key}"
    response = requests.get(url)
    return response.json()

# Example usage
result = check_license("KEY-XXXX-YYYY")
if result['valid']:
    print("Access Granted")
else:
    print(f"Access Denied: {result['message']}")
```

## License
MIT
