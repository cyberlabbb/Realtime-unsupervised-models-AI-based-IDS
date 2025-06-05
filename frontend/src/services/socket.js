import { io } from "socket.io-client";

// Configuration
const PORTS = [5000]; // Remove 5001, just use backend port
const HOST = "localhost";
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;
let socketInstance = null;


const createSocket = (port) => {
  return io(`http://${HOST}:${port}`, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY,
    timeout: 10000,
    debug: true,
  });
};
localStorage.debug = "*";
const getWorkingSocket = async () => {
  for (const port of PORTS) {
    try {
      const socket = createSocket(port);

      // Wait for connection or error
      const result = await new Promise((resolve) => {
        const timeoutId = setTimeout(
          () => resolve({ success: false, port }),
          3000
        );

        socket.once("connect", () => {
          clearTimeout(timeoutId);
          resolve({ success: true, socket, port });
        });

        socket.once("connect_error", () => {
          clearTimeout(timeoutId);
          socket.close();
          resolve({ success: false, port });
        });
      });

      if (result.success) {
        console.log(`Successfully connected to port ${port}`);
        return result.socket;
      }

      console.log(`Failed to connect to port ${port}`);
    } catch (error) {
      console.warn(`Error trying port ${port}:`, error);
    }
  }
  throw new Error("Failed to connect to any socket port");
};

export const setupSocket = async (
  onAlert,
  onPacketReceived,
  setProgress,
  setAlerts
) => {
  // Thêm onPacketReceived
  // Clean up existing connection
  if (socketInstance) {
    console.log("Cleaning up existing socket connection");
    socketInstance.disconnect();
    socketInstance = null;
  }

  try {
    // Attempt to establish connection
    socketInstance = await getWorkingSocket();

    // Set up event handlers
    socketInstance.on("connect", () => {
      console.log("Socket connected successfully");
      console.log("Socket ID:", socketInstance.id);
    });

    socketInstance.on("capture_status", (data) => {
      console.log("Received capture status:", data);
    });

    socketInstance.on("new_packet", (data) => {
      console.log("Received packet data:", data);
      if (onPacketReceived) {
        onPacketReceived(data);
      }
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socketInstance.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socketInstance.on("new_packet", (packet) => {
      console.log("Received new packet:", packet);
      if (onPacketReceived) {
        onPacketReceived(packet);
      }
    });

    socketInstance.on("intrusion_alert", (alert) => {
      console.log("🚨 Received intrusion alert:", alert);
      if (onAlert) {
        onAlert(alert);
      }
    });

    
    socketInstance.emit("request_initial_packets", { limit: 100 });

    socketInstance.on("initial_packets", (data) => {
      console.log("Received initial packets:", data.packets);
      if (onPacketReceived && data.packets) {
        data.packets.forEach((p) => onPacketReceived(p));
      }
    });

    return () => {
      console.log("Cleaning up socket connection");
      if (socketInstance) {
        socketInstance.off("intrusion_alert");
        socketInstance.off("capture_status");
        socketInstance.off("new_packet");
        socketInstance.off("initial_packets");
        socketInstance.disconnect();
        socketInstance = null;
      }
    };
  } catch (error) {
    console.error("Failed to setup socket:", error);
    throw error;
  }
};


export const getSocket = () => socketInstance;
