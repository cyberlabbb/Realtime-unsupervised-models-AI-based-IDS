import { io } from "socket.io-client";

let socket = null;

export const setupSocket = (onNewBatch, onNewPacket, onNewAlert) => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      socket = io("http://localhost:5000", {
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });
    }

    // socket = io("http://localhost:5000", {
    //   transports: ["websocket"],
    //   reconnectionAttempts: 5,
    //   reconnectionDelay: 1000,
    //   timeout: 10000,
    // });

    socket.on("connect", () => {
      console.log("✅ Socket connected");
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      reject(error);
    });

    if (onNewPacket) {
      socket.on("new_packet", (packet) => {
        console.log("📦 Received new packet");
        onNewPacket(packet);
      });
    }

    if (onNewBatch) {
      socket.on("new_batch", (newBatch) => {
        console.log("🗂️ Received new batch");
        onNewBatch(newBatch);
      });
    }

    if (onNewAlert) {
      socket.on("intrusion_alert", (alert) => {
        console.log("🚨 Intrusion alert");
        onNewAlert(alert);
      });
    }

    socket.on("disconnect", () => {
      console.log("⚠️ Socket disconnected");
    });
  });
};

export const closeSocket = () => {
  if (socket) {
    console.log("🔌 Closing socket connection");
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
