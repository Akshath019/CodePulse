import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = "http://localhost:4000";

export function useSocket(roomId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[SOCKET] Connected:", socket.id);
      setConnected(true);
      socket.emit("room:join", roomId);
    });

    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  return { socket: socketRef.current, connected };
}
