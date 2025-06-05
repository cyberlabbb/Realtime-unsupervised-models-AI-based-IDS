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
import pandas as pd

from collections import Counter
from bson.regex import Regex

capture_interface = "Wi-Fi" 

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
    flows_collection = db["flows"]
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
        iface= capture_interface, 
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


@app.route("/api/capture/interface", methods=["POST"])
def update_capture_interface():
    global capture_interface
    try:
        data = request.get_json()
        new_iface = data.get("iface")
        if not new_iface:
            return jsonify({"error": "iface is required"}), 400

        capture_interface = new_iface
        logger.info(f"Interface updated to: {capture_interface}")
        return jsonify({"message": f"Interface set to {capture_interface}"}), 200
    except Exception as e:
        logger.error(f"Failed to update interface: {e}")
        return jsonify({"error": str(e)}), 500

import psutil


@app.route("/api/capture/interface", methods=["GET"])
def get_capture_interface():
    try:
        available_ifaces = list(psutil.net_if_addrs().keys())
        return jsonify(
            {"iface": capture_interface, "available_ifaces": available_ifaces}
        )
    except Exception as e:
        logger.error(f"Failed to get interfaces: {e}")
        return jsonify({"error": str(e)}), 500


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

from flask import jsonify
import pandas as pd
import os


@app.route("/api/csv/<alert_id>", methods=["GET"])
def get_csv_data(alert_id):
    try:
        alert = alerts_collection.find_one({"_id": ObjectId(alert_id)})
        if not alert:
            return jsonify({"error": "Alert not found"}), 404

        csv_path = alert.get("csv_path")
        if not csv_path or not os.path.exists(csv_path):
            return jsonify({"error": "CSV file not found"}), 404

        df = pd.read_csv(csv_path)

        # 💥 Sửa lỗi Infinity → chuỗi
        df = df.replace([np.inf, -np.inf], np.nan).fillna("")

        # Ép toàn bộ dữ liệu về kiểu Python native tránh lỗi serialization
        for col in df.columns:
            df[col] = df[col].map(lambda x: x.item() if hasattr(x, "item") else x)

        return jsonify(
            {"columns": list(df.columns), "rows": df.to_dict(orient="records")}
        )

    except Exception as e:
        logger.error(f"Failed to return CSV data for alert {alert_id}: {e}")
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


@app.route("/api/alerts/<alert_id>", methods=["DELETE"])
@token_required 
def delete_alert(current_user, alert_id):
    try:
        # First find the alert to get the batch_id
        alert = alerts_collection.find_one({"_id": ObjectId(alert_id)})
        if not alert:
            return jsonify({"error": "Alert not found"}), 404

        # Delete associated files
        if alert.get("pcap_path") and os.path.exists(alert["pcap_path"]):
            os.remove(alert["pcap_path"])
        if alert.get("csv_path") and os.path.exists(alert["csv_path"]):
            os.remove(alert["csv_path"])

        # Delete the alert
        result = alerts_collection.delete_one({"_id": ObjectId(alert_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Alert not found"}), 404

        # Delete associated batch if it exists
        if alert.get("batch_id"):
            batch_result = batches_collection.delete_one({"_id": ObjectId(alert["batch_id"])})
            logger.info(f"Deleted associated batch: {batch_result.deleted_count > 0}")

            # Also delete any other alerts with the same batch_id
            alerts_collection.delete_many({
                "_id": {"$ne": ObjectId(alert_id)},  # Don't delete the current alert again
                "batch_id": alert["batch_id"]
            })

        return jsonify({
            "message": "Alert and associated data deleted successfully",
            "alert_id": alert_id,
            "batch_id": alert.get("batch_id")
        })

    except Exception as e:
        logger.error(f"Failed to delete alert {alert_id}: {e}")
        return jsonify({"error": str(e)}), 500

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


@app.route("/api/flows", methods=["GET"])
def get_flows():
    """
    Lấy danh sách các flow từ MongoDB. Hỗ trợ filter theo:
    - batch_index
    - src_ip (Src IP)
    - dst_ip (Dst IP)
    - protocol (Protocol)
    - label (Label)
    - limit, skip
    """
    try:
        limit = int(request.args.get("limit", 100))
        skip = int(request.args.get("skip", 0))

        query = {}

        # Lọc theo batch_index
        batch_index = request.args.get("batch_index")
        if batch_index is not None:
            try:
                query["batch_index"] = int(batch_index)
            except ValueError:
                return jsonify({"error": "batch_index must be an integer"}), 400

        # Lọc theo Src IP
        src_ip = request.args.get("src_ip")
        if src_ip:
            query["Src IP"] = src_ip

        # Lọc theo Dst IP
        dst_ip = request.args.get("dst_ip")
        if dst_ip:
            query["Dst IP"] = dst_ip

        # Lọc theo Protocol
        protocol = request.args.get("protocol")
        if protocol:
            try:
                query["Protocol"] = int(protocol)
            except ValueError:
                return jsonify({"error": "protocol must be an integer"}), 400

        # Lọc theo Label
        label = request.args.get("label")
        if label:
            query["Label"] = label

        raw_flows = list(
            flows_collection.find(query, {"_id": 0})
            .sort("Timestamp", -1)
            .skip(skip)
            .limit(limit)
        )

        # ✅ Clean các giá trị không hợp lệ như Infinity
        import math

        def clean_value(val):
            if isinstance(val, float) and (math.isinf(val) or math.isnan(val)):
                return None
            return val

        def clean_dict(d):
            return {k: clean_value(v) for k, v in d.items()}

        flows = [clean_dict(f) for f in raw_flows]

        total = flows_collection.count_documents(query)

        return jsonify(
            {
                "data": flows,
                "meta": {
                    "total": total,
                    "limit": limit,
                    "skip": skip,
                    "filters": query,
                },
            }
        )

    except Exception as e:
        logger.error(f"Failed to get flows: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/flows/summary", methods=["GET"])
def get_flow_summary():
    try:
        flows = list(
            flows_collection.find(
                {},
                {
                    "_id": 0,
                    "Src IP": 1,
                    "Dst IP": 1,
                    "Dst Port": 1,
                    "Protocol": 1,
                    "Timestamp": 1,
                },
            )
        )

        # Bộ đếm
        src_ips = Counter()
        dst_ips = Counter()
        dst_ports = Counter()
        protocols = Counter()
        traffic_time = Counter()

        for flow in flows:
            src_ips[flow.get("Src IP")] += 1
            dst_ips[flow.get("Dst IP")] += 1
            dst_ports[str(flow.get("Dst Port"))] += 1
            proto = flow.get("Protocol")
            protocols[str(proto)] += 1

            # Tổng hợp theo khung giờ
            ts = flow.get("Timestamp")
            try:
                t = datetime.datetime.strptime(ts, "%d/%m/%Y %I:%M:%S %p")
                label = t.strftime("%H:%M")
                traffic_time[label] += 1
            except Exception:
                continue

        def top_n(counter):
            return [{"name": k, "value": v} for k, v in counter.most_common(10)]

        return jsonify(
            {
                "top_source_ips": top_n(src_ips),
                "top_destination_ips": top_n(dst_ips),
                "top_destination_ports": top_n(dst_ports),
                "top_protocols": top_n(protocols),
                "traffic_over_time": [
                    {"time": k, "count": v} for k, v in sorted(traffic_time.items())
                ],
                "updated_at": datetime.datetime.utcnow().isoformat(),
            }
        )

    except Exception as e:
        logger.error(f"Failed to summarize flows: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/batches/<batch_id>", methods=["GET"])
def get_batch_detail(batch_id):
    """Get detailed batch information by ObjectId"""
    try:
        batch = batches_collection.find_one({"_id": ObjectId(batch_id)})
        if not batch:
            return jsonify({"error": "Batch not found"}), 404

        batch_json = json.loads(json_util.dumps(batch))
        return jsonify(batch_json)
    except Exception as e:
        logger.error(f"Failed to fetch batch {batch_id}: {e}")
        return jsonify({"error": str(e)}), 500


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
