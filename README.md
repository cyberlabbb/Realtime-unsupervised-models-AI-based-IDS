# Realtime IDS Project for IoT system

A lightweight Intrusion Detection System (IDS) for IoT / network traffic analysis.
This repository contains a Flask + Flask-SocketIO backend that captures network packets,
processes them into flows, runs ML-based anomaly detection (autoencoder / kmeans / OC-SVM),
stores batch/flow data in MongoDB, and a React frontend that shows real-time packets, batches and alerts.

---

## Prerequisites

- Python 3.9+ (Windows)
- Node.js 16+ and npm
- MongoDB instance (connection URI)
- (Windows only) Npcap or WinPcap installed for raw packet capture (Scapy)
- (Optional) CICFlowMeter if you use flow extraction via CICFlowMeter
- Recommended: create Python virtual environment

---

## Backend — Setup & Run

1. Create & activate virtualenv (Windows PowerShell):
   - python -m venv venv
   - .\venv\Scripts\Activate.ps1

2. Install Python dependencies:
   - pip install -r requirements.txt

3. Environment variables
   - Copy `.env` template or create `.env` in project root with at least:
     ```
     BACK_END_PORT=5000
     MONGO_URI=<your-mongodb-uri>
     SECRET_KEY=<your-secret-key>
     ```
   - If using TensorFlow models, ensure `Model/` directory contains the trained model files used by the backend.

4. Optional tools
   - Install Npcap (required for Scapy sniffing on Windows).
   - If you use CICFlowMeter, place it under project folder `CICFlowMeter-4.0/bin` or update paths in `server_v2.py` / `function2.py`.

5. Start backend:
   - From project root:
     ```
     .\venv\Scripts\Activate.ps1
     python server_v2.py
     ```
   - Server default: http://0.0.0.0:5000 (port from BACK_END_PORT)

Notes:
- Run terminal as Administrator if raw packet capture requires elevated privileges.
- If TensorFlow fails to load GPU libraries, either install matching TensorFlow wheel or use CPU-only settings.

---

## Frontend — Setup & Run

1. Enter frontend folder:
   - cd frontend

2. Install npm dependencies:
   - npm install

3. Configure env (frontend/.env):
   - Ensure `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` point to backend (default `http://localhost:5000`).

4. Start frontend:
   - npm start
   - Opens at http://localhost:3000 by default

---

## Usage

- Open the frontend in browser, log in or register.
- Start/stop capture from UI (requires backend capture to be running and proper permissions).
- Realtime packets and batches are delivered via Socket.IO.
- Use "Batch Detail" page to download CSV / PCAP and delete batches.

---

## Troubleshooting

- Socket connection 500 errors:
  - Ensure backend started with socketio.run and only one Flask/SocketIO instance exists.
- Packet capture returns no flows:
  - Check Npcap installed and user has permissions; ensure CICFlowMeter produces CSV.
- ML model dtype errors:
  - Ensure features are cast to float64 before passing to sklearn (see function2.py).
- MongoDB connection:
  - Verify MONGO_URI and network access to cluster.

---

## Development tips

- Keep Socket.IO connection centralized in `frontend/src/services/socket.js`.
- Only create one socket instance; connect/disconnect on `document.visibilitychange` if needed.
- Maintain global `totalPacketCount` in App (use refs/localStorage) and only render a small subset of packets for UI performance.

---

## License & Acknowledgements

- This project is for research / educational use.
- External tools: Scapy, CICFlowMeter, TensorFlow, scikit-learn, MongoDB.

---

## How to Run IDS IoT

### 1️⃣ Start the Frontend:

```bash
cd Frontend
npm install
npm start
```

### 2️⃣ Open another terminal and start the Backend:

```bash
python server_v2.py
```
