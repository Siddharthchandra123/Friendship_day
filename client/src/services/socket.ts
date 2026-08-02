import { io } from "socket.io-client";

const SIGNALING_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://friendverse-signaling.onrender.com";

export const socket = io(SIGNALING_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 20000,
    transports: ["websocket", "polling"]
});