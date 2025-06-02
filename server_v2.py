from flask import Flask, jsonify, request
from concurrent.futures import ThreadPoolExecutor
import threading
from flask_socketio import SocketIO
import logging
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv
import atexit
import signal
import sys
from function2 import handle_packet
from flask_cors import CORS
from scapy.all import sniff
import numpy as np
import os
from bson import ObjectId, json_util
from flask import jsonify
import json
from socket_instance import socketio, app
from function2 import handle_packet
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps

# Environment setup
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("app.log")],
)
logger = logging.getLogger(__name__)


# Thread management
executor = ThreadPoolExecutor(max_workers=4)
lock = threading.Lock()

# Load environment variables
load_dotenv()

# MongoDB setup
try:
    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        raise ValueError("MONGO_URI environment variable not set")

    client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=5000,
        tls=True,
        tlsAllowInvalidCertificates=True,  # For testing only
    )
    client.server_info()  # Test connection
    db = client["network_monitor"]
    batches_collection = db["batches"]
    alerts_collection = db["alerts"]
    logger.info("Successfully connected to MongoDB")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    sys.exit(1)

# Directory setup
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "pcap_splits"
CSV_OUTPUT_DIR = BASE_DIR / "csv_cicflowmeter"
CICFLOWMETER_DIR = BASE_DIR / "CICFlowMeter-4.0" / "bin"
ALERT_DIR = BASE_DIR / "alerts"
MODEL_DIR = BASE_DIR / "Model"

# Create required directories
required_dirs = [OUTPUT_DIR, CSV_OUTPUT_DIR, ALERT_DIR, CICFLOWMETER_DIR, MODEL_DIR]
for directory in required_dirs:
    try:
        directory.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to create directory {directory}: {e}")
        sys.exit(1)

# Global state
packet_count = 0
packet_buffer = []
file_index = 0
all_predictions = []
sniff_thread = None
sniff_control = threading.Event()
is_sniffing = False

# --------------------------
# Helper Functions
# --------------------------


def cleanup():
    """Cleanup function for graceful shutdown"""
    logger.info("Cleaning up resources...")
    if sniff_thread and sniff_thread.is_alive():
        sniff_control.set()
    executor.shutdown(wait=False)
    if "client" in globals():
        client.close()
    logger.info("Cleanup complete")


def signal_handler(sig, frame):
    """Signal handler for graceful shutdown"""
    logger.info("Received shutdown signal")
    cleanup()
    sys.exit(0)


def run_sniff():
    """Wrapper function for sniff that respects the stop signal"""
    sniff(
        iface="Wi-Fi", 
        prn=handle_packet,
        store=False,
        stop_filter=lambda x: sniff_control.is_set(),
    )


def start_packet_capture():
    global sniff_thread, is_sniffing
    if not is_sniffing:
        sniff_control.clear()
        sniff_thread = threading.Thread(
            target=run_sniff,
            daemon=True,
        )
        sniff_thread.start()
        is_sniffing = True
        socketio.emit("capture_status", {"is_sniffing": True})
        logger.info("Packet capture started")
        return True
    return False


def stop_packet_capture():
    global is_sniffing
    if is_sniffing:
        sniff_control.set()
        is_sniffing = False
        socketio.emit("capture_status", {"is_sniffing": False})
        logger.info("Packet capture stopped")
        return True
    return False


# --------------------------
# API Endpoints
# --------------------------


app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['JWT_EXPIRATION_DELTA'] = datetime.timedelta(hours=1)

users_collection = db["users"]

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token.split()[1], app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users_collection.find_one({"_id": ObjectId(data['user_id'])})
        except:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(current_user, *args, **kwargs)
    return decorated


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    if users_collection.find_one({"email": data["email"]}):
        return jsonify({"error": "Email already exists"}), 400

    if users_collection.find_one({"name": data["name"]}):
        return jsonify({"error": "Username already exists"}), 400
   
    hashed_password = generate_password_hash(
        data["password"]
    )  

    user = {
        "name": data.get("name", ""),
        "email": data["email"],
        "password": hashed_password,
        "created_at": datetime.datetime.utcnow(),
    }

   
    try:
        user_id = users_collection.insert_one(user).inserted_id
    except Exception as e:
        logger.error(f"Failed to create user: {e}")
        return jsonify({"error": "Failed to create user"}), 500

    token = jwt.encode(
        {
            "user_id": str(user_id),
            "exp": datetime.datetime.utcnow() + app.config["JWT_EXPIRATION_DELTA"],
        },
        app.config["SECRET_KEY"],
        algorithm="HS256",  # Specify the algorithm
    )

    return (
        jsonify(
            {
                "message": "User registered successfully",
                "token": token,
                "user": {
                    "id": str(user_id),
                    "name": user["name"],
                    "email": user["email"],
                },
            }
        ),
        201,
    )


@app.route("/api/auth/login", methods=["POST"])
def login():
    auth = request.get_json()

    if not auth or not auth.get("name") or not auth.get("password"):
        return jsonify({"error": "Username and password required"}), 400

    user = users_collection.find_one({"name": auth["name"]})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if not check_password_hash(user["password"], auth["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    try:
        token = jwt.encode(
            {
                "user_id": str(user["_id"]),
                "exp": datetime.datetime.utcnow() + app.config["JWT_EXPIRATION_DELTA"],
            },
            app.config["SECRET_KEY"],
            algorithm="HS256",
        )
    except Exception as e:
        logger.error(f"Failed to generate token: {e}")
        return jsonify({"error": "Failed to generate token"}), 500

    return jsonify(
        {
            "message": "Login successful",
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
            },
        }
    )


@app.route('/api/protected', methods=['GET'])
@token_required
def protected_route(current_user):
    return jsonify({
        "message": f"Hello {current_user['name']}, this is a protected route!",
        "user": {
            "id": str(current_user['_id']),
            "name": current_user['name'],
            "email": current_user['email']
        }
    })

@app.route("/api/status", methods=["GET"])
def api_status():
    """Return server status"""
    try:
        return jsonify(
            {
                "status": "running",
                "packet_count": packet_count,
                "buffer_size": len(packet_buffer),
                "last_processed": file_index,
                "is_sniffing": is_sniffing,
                "thread_alive": sniff_thread.is_alive() if sniff_thread else False,
            }
        )
    except Exception as e:
        logger.error(f"Status error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/batches/all", methods=["GET"])
def get_all_batches():
    """Lấy toàn bộ batches từ MongoDB (không phân trang)"""

    def parse_json(data):
        return json.loads(json_util.dumps(data))

    try:
        batches = list(batches_collection.find())
        return jsonify({"data": parse_json(batches), "total": len(batches)})
    except Exception as e:
        logger.error(f"Failed to fetch all batches: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/batches", methods=["GET"])
def get_batches():
    """Get recent batches from MongoDB"""
    try:
        limit = int(request.args.get("limit", 50))
        skip = int(request.args.get("skip", 0))

        batches = list(
            batches_collection.find({}, {"_id": 0})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        total = batches_collection.count_documents({})

        return jsonify(
            {"data": batches, "meta": {"total": total, "limit": limit, "skip": skip}}
        )
    except Exception as e:
        logger.error(f"Failed to fetch batches: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/alerts/all", methods=["GET"])
def get_all_alerts():
    """Lấy toàn bộ alerts với xử lý ObjectId"""
    try:
        # Tạo hàm hỗ trợ chuyển đổi ObjectId
        def parse_json(data):
            return json.loads(json_util.dumps(data))

        alerts = list(alerts_collection.find({}))

        return jsonify({"data": parse_json(alerts), "total": len(alerts)})

    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """Get recent alerts from MongoDB with filtering options"""
    try:
        limit = int(request.args.get("limit", 50))
        skip = int(request.args.get("skip", 0))
        severity = request.args.get("severity")

        query = {}
        if severity:
            query["severity"] = severity.upper()

        alerts = list(
            alerts_collection.find(query, {"_id": 0})
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )

        total = alerts_collection.count_documents(query)

        return jsonify(
            {
                "data": alerts,
                "meta": {
                    "total": total,
                    "limit": limit,
                    "skip": skip,
                    "severity_filter": severity,
                },
            }
        )
    except Exception as e:
        logger.error(f"Failed to fetch alerts: {e}")
        return jsonify({"error": str(e)}), 500

from bson.objectid import ObjectId


@app.route("/api/alerts/<alert_id>", methods=["GET"])
def get_alert_detail(alert_id):
    """Get detailed information for a specific alert by ID"""
    try:
        alert = alerts_collection.find_one({"_id": ObjectId(alert_id)})

        if not alert:
            return jsonify({"error": "Alert not found"}), 404

        # Chuyển ObjectId và datetime sang định dạng JSON
        alert_json = json.loads(json_util.dumps(alert))
        return jsonify(alert_json)

    except Exception as e:
        logger.error(f"Failed to fetch alert {alert_id}: {e}")
        return jsonify({"error": str(e)}), 500
from flask import send_file


@app.route("/api/download/csv/<alert_id>")
def download_csv(alert_id):
    alert = alerts_collection.find_one({"_id": ObjectId(alert_id)})
    if alert and alert.get("csv_path") and os.path.exists(alert["csv_path"]):
        return send_file(alert["csv_path"], as_attachment=True)
    return jsonify({"error": "CSV file not found"}), 404


@app.route("/api/download/pcap/<alert_id>")
def download_pcap(alert_id):
    alert = alerts_collection.find_one({"_id": ObjectId(alert_id)})
    if alert and alert.get("pcap_path") and os.path.exists(alert["pcap_path"]):
        return send_file(alert["pcap_path"], as_attachment=True)
    return jsonify({"error": "PCAP file not found"}), 404


@app.route("/api/batches/<batch_id>", methods=["GET"])
def get_batch_details(batch_id):
    """Get detailed batch information with related alerts"""
    try:
        batch = batches_collection.find_one({"batch_name": batch_id}, {"_id": 0})
        if not batch:
            return jsonify({"error": "Batch not found"}), 404

        alerts = list(
            alerts_collection.find({"batch_id": batch_id}, {"_id": 0})
            .sort("timestamp", -1)
            .limit(100)
        )

        return jsonify({"batch": batch, "alerts": alerts, "alert_count": len(alerts)})
    except Exception as e:
        logger.error(f"Failed to fetch batch details: {e}")
        return jsonify({"error": "Failed to fetch batch details"}), 500


@app.route("/api/capture/start", methods=["POST"])
def api_start_capture():
    """Start packet capture"""
    try:
        if start_packet_capture():
            return jsonify(
                {
                    "status": "success",
                    "message": "Packet capture started",
                    "is_sniffing": True,
                }
            )
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Capture already running",
                    "is_sniffing": True,
                }
            ),
            400,
        )
    except Exception as e:
        logger.error(f"Start capture error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/capture/stop", methods=["POST"])
def api_stop_capture():
    """Stop packet capture"""
    try:
        if stop_packet_capture():
            return jsonify(
                {
                    "status": "success",
                    "message": "Packet capture stopped",
                    "is_sniffing": False,
                }
            )
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "No capture running",
                    "is_sniffing": False,
                }
            ),
            400,
        )
    except Exception as e:
        logger.error(f"Stop capture error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/capture/status", methods=["GET"])
def api_capture_status():
    """Get current capture status"""
    return jsonify(
        {
            "is_sniffing": is_sniffing,
            "packet_count": packet_count,
            "last_processed": file_index,
        }
    )


@socketio.on("connect")
def handle_connect():
    logger.info("Client connected")


@socketio.on("disconnect")
def handle_disconnect():
    logger.info("Client disconnected")


@socketio.on("start_capture")
def handle_start_capture():
    logger.info("Starting capture from socket request")
    start_packet_capture()


@socketio.on("connect")
def handle_connect():
    logger.info("Client connected")
    
    socketio.emit(
        "capture_status", {"is_sniffing": is_sniffing, "packet_count": packet_count}
    )


@socketio.on("disconnect")
def handle_disconnect():
    logger.info("Client disconnected")


# Add debug event handler
@socketio.on("debug")
def handle_debug(data):
    logger.info(f"Debug event received: {data}")
    socketio.emit("debug_response", {"received": data})


# --------------------------
# Startup and Shutdown
# --------------------------

atexit.register(cleanup)
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
    PORT = int(os.getenv("BACKEND_PORT", 5000))

    try:
        socketio.run(
            app,
            host=HOST,
            port=PORT,
            allow_unsafe_werkzeug=True,
            use_reloader=False,
            debug=True,
        )
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)
