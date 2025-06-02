from flask import Flask, send_from_directory
from scapy.all import sniff
import os
from tensorflow.keras.models import load_model
import joblib
from concurrent.futures import ThreadPoolExecutor
import threading
from flask import jsonify
from flask_socketio import SocketIO
import logging
from pathlib import Path
from keras.losses import MeanSquaredError
from keras.models import load_model
from flask_cors import CORS


from function2 import handle_packet

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=None)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
executor = ThreadPoolExecutor(max_workers=4)
lock = threading.Lock()


BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "pcap_splits"
CSV_OUTPUT_DIR = BASE_DIR / "csv_cicflowmeter"
CICFLOWMETER_DIR = BASE_DIR / "CICFlowMeter-4.0" / "bin"
CFM_PATH = CICFLOWMETER_DIR / "cfm.bat"
ALERT_DIR = BASE_DIR / "alerts"
CHUNK_SIZE = 5000

OUTPUT_DIR.mkdir(exist_ok=True)
CSV_OUTPUT_DIR.mkdir(exist_ok=True)
ALERT_DIR.mkdir(exist_ok=True)
CICFLOWMETER_DIR.mkdir(parents=True, exist_ok=True)

custom_objects = {"mse": MeanSquaredError()}
try:
    MODEL = load_model(BASE_DIR / "Model" / "autoencoder.h5", compile=False)
    SCALER = joblib.load(BASE_DIR / "Model" / "scaler.pkl")
    logger.info("ML models loaded successfully")
except Exception as e:
    logger.error(f"Failed to load ML models: {e}")
    raise
packet_count = 0
packet_buffer = []
file_index = 0


all_predictions = []


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    frontend_build = BASE_DIR / "frontend" / "build"
    static_file = frontend_build / path if path else frontend_build / "index.html"

    if path and static_file.exists():
        return send_from_directory(str(frontend_build), path)

    return send_from_directory(str(frontend_build), "index.html")


@app.route("/status")
def status():
    return jsonify(
        {
            "status": "running",
            "packet_count": packet_count,
            "buffer_size": len(packet_buffer),
            "last_processed": file_index,
        }
    )


@app.route("/api/data")
def get_data():
    return jsonify({"message": "Hello from Flask!"})


@app.route("/predictions", methods=["GET"])
def get_predictions():
    return jsonify(all_predictions)


if __name__ == "__main__":
    frontend_dir = BASE_DIR / "frontend"
    if not frontend_dir.exists():
        logger.error("Frontend directory not found at %s", frontend_dir)
    elif not (frontend_dir / "build").exists():
        logger.warning("Frontend build not found. Please build the React app first.")
        logger.info("Run: cd frontend && npm install && npm run build")

    try:

        sniff_thread = threading.Thread(
            target=sniff,
            kwargs={"iface": "Wi-Fi", "prn": handle_packet, "store": False},
            daemon=True,
        )

        sniff_thread.start()
        logger.info("Starting server on http://localhost:5000")
        socketio.run(app, host="127.0.0.1", port=5000)

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error("Fatal error: %s", e)
