# Deployment and Execution Instructions

This document provides a guide for running the Smart Nutrition Intelligence System (SNIS) both locally and in a production cloud environment.

---

## 1. Local Development Execution

### Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template and set your values:
   ```bash
   cp .env.template .env
   # Open .env and set:
   # DB_PASSWORD = your local postgres password
   # GEMINI_API_KEY = your Google AI Studio Gemini API Key
   ```
5. Launch the backend development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * *Swagger interactive documentation is now available at:* `http://localhost:8000/docs`

### Frontend (React + Vite)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   * *The web interface is available at:* `http://localhost:5173/`

---

## 2. Containerized Execution (Docker Compose)

The easiest way to run the entire stack (Database, Backend, and Frontend) with a single command is utilizing Docker Compose.

### Instructions:
1. Ensure you have **Docker Desktop** installed and running.
2. In the root directory of the project, copy the backend `.env` variables or create an environment file to supply secrets.
3. Run the container cluster:
   ```bash
   docker-compose up --build -d
   ```
4. Verification:
   * **Database**: Runs inside Docker on port `5432` with state persistence mapped to `postgres_data`.
   * **FastAPI API**: Accessible at `http://localhost:8000/`
   * **React UI**: Served via Nginx at `http://localhost/`

To stop the containers:
```bash
docker-compose down
```

---

## 3. Production Deployment on a VPS (DigitalOcean / AWS / Linode)

To host this application permanently on a Virtual Private Server (VPS), follow these standard DevOps steps:

### Step 1: Server Setup
1. Spin up an Ubuntu LTS VPS.
2. Update system packages and install Docker + Docker Compose:
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   sudo apt-get install -y docker.io docker-compose git nginx certbot python3-certbot-nginx
   ```

### Step 2: Clone & Configure
1. Clone your project repository onto the server:
   ```bash
   git clone <your-repo-url> /var/www/snis
   cd /var/www/snis
   ```
2. Create your production `.env` file in `/var/www/snis` with secure credentials and API keys.

### Step 3: Start Docker Cluster
1. Launch Docker Compose in daemon mode:
   ```bash
   docker-compose up --build -d
   ```

### Step 4: Configure Nginx as a Reverse Proxy
1. Create a server configuration file `/etc/nginx/sites-available/snis`:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       # Frontend requests -> map to Nginx container
       location / {
           proxy_pass http://localhost:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Backend API requests -> forward to FastAPI
       location /api/ {
           proxy_pass http://localhost:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
2. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/snis /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Step 5: Secure with Let's Encrypt HTTPS
1. Request SSL certificates via Certbot:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
2. Certbot will automatically configure Nginx to redirect all insecure HTTP traffic to secure HTTPS.

---

## 4. PaaS Deployment Alternatives (Serverless / Managed Hosting)

If you do not want to manage a Linux virtual machine yourself, you can deploy each layer serverlessly:

1. **Database**: Use a managed cloud Postgres database like **Neon** or **Supabase** (Free Tier).
2. **Backend API**: Deploy the `backend/` folder to **Render.com** (Web Service). Select Python runtime, configure environment variables, and set start command to:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. **Frontend App**: Deploy the `frontend/` folder to **Vercel** or **Netlify**. Set the build command to `npm run build` and output directory to `dist`. Ensure you set the `API_BASE` in your frontend source code to your Render backend URL.
