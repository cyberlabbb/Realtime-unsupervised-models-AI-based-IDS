from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

socketio = SocketIO(
    app,
    cors_allowed_origins=["http://localhost:3000"],
    logger=False,
    engineio_logger=False,
    async_mode="threading",
    ping_timeout=60000,
    ping_interval=25000,
    allow_upgrades=True,
)
