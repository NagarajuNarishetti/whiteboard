"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type DrawEvent = {
  x: number;
  y: number;
  prevX: number | null;
  prevY: number | null;
  color: string;
  lineWidth: number;
  username?: string;
  authorId?: string;
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [userColor, setUserColor] = useState<string>("#4444ff");
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [userCount, setUserCount] = useState<number>(1);
  const [username, setUsername] = useState<string>("");
  const [presence, setPresence] = useState<Array<{ id: string; name: string; color: string }>>([]);
  // const [myId, setMyId] = useState<string>("");

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const resizeCanvasToContainer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = context;
  }, [dpr]);

  const drawSegment = useCallback((e: DrawEvent) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = e.color;
    ctx.lineWidth = e.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    if (e.prevX !== null && e.prevY !== null) {
      ctx.moveTo(e.prevX, e.prevY);
      ctx.lineTo(e.x, e.y);
    } else {
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + 0.01, e.y + 0.01);
    }
    ctx.stroke();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    // Clear the full backing store regardless of current transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, []);

  useEffect(() => {
    resizeCanvasToContainer();
    const onResize = () => {
      const imageData = ctxRef.current?.getImageData(
        0,
        0,
        canvasRef.current?.width || 0,
        canvasRef.current?.height || 0
      );
      resizeCanvasToContainer();
      if (imageData && ctxRef.current) {
        ctxRef.current.putImageData(imageData, 0, 0);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeCanvasToContainer]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      // setMyId(socket.id || "");
    });
    socket.on("init", (payload: { color: string; name: string }) => {
      setUserColor(payload.color);
      setUsername(payload.name);
    });
    socket.on("boardState", (payload: { strokes: DrawEvent[] }) => {
      clearCanvas();
      payload.strokes.forEach((s) => drawSegment(s));
    });
    socket.on("users", (payload: { count: number }) => {
      setUserCount(payload.count);
    });
    socket.on("presence", (payload: { count: number; users: Array<{ id: string; name: string; color: string }> }) => {
      setPresence(payload.users);
    });
    socket.on("draw", (payload: DrawEvent) => {
      drawSegment(payload);
    });
    socket.on("clear", () => {
      clearCanvas();
    });

    return () => {
      socket.disconnect();
    };
  }, [drawSegment, clearCanvas]);

  const handlePointerDown = useCallback((ev: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    setIsDrawing(true);
    setLastPoint({ x, y });
    drawSegment({ x, y, prevX: null, prevY: null, color: userColor, lineWidth, username: username || "" });
    socketRef.current?.emit("draw", {
      x,
      y,
      prevX: null,
      prevY: null,
      lineWidth,
    } as DrawEvent);
  }, [drawSegment, userColor, lineWidth, username]);

  const handlePointerMove = useCallback((ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const prev = lastPoint;
    if (!prev) return;
    const payload: DrawEvent = {
      x,
      y,
      prevX: prev.x,
      prevY: prev.y,
      color: userColor,
      lineWidth,
    };
    drawSegment({ ...payload, color: userColor, username: username || "" });
    socketRef.current?.emit("draw", payload);
    setLastPoint({ x, y });
  }, [isDrawing, lastPoint, drawSegment, userColor, lineWidth, username]);

  const endDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  const handleRequestClearAll = useCallback(() => {
    // If alone, server will clear without prompt; otherwise it will ask others
    socketRef.current?.emit("requestClearAll");
  }, []);

  const preventGestureScroll = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-black/10 bg-white/80 sticky top-0 z-10 backdrop-blur">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: userColor }}
            aria-label="Your color"
          />
          <span className="font-semibold">CanvasBoard</span>
          <span className="text-sm text-black/60">{userCount} online</span>
          <div className="flex items-center gap-3 ml-6 overflow-x-auto max-w-[50vw]">
            {presence.map((u) => (
              <div key={u.id} className="flex items-center gap-1 shrink-0">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.color }} />
                <span className="text-xs text-black/80" title={u.name}>{u.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <input
            className="px-2 py-1 rounded-md border border-black/10"
            placeholder="Your name"
            value={username}
            onChange={(e) => {
              const v = e.target.value.slice(0, 24);
              setUsername(v);
              socketRef.current?.emit("setName", { name: v });
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <span>Width</span>
            <input
              type="range"
              min={1}
              max={20}
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestClearAll}
              className="px-3 py-1.5 rounded-md border border-black/10 hover:bg-red-500/10 active:scale-[.99]"
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="w-full h-[calc(100vh-64px)] grid grid-cols-1 md:grid-cols-[1fr_260px]">
          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none bg-[conic-gradient(at_top_left,_#fafafa,_#f5f5f5)]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            onPointerLeave={endDrawing}
            onPointerEnter={preventGestureScroll}
          />
          <aside className="hidden md:flex flex-col border-l border-black/10 p-3 gap-2 bg-white/70">
            <div className="text-sm font-medium">Info</div>
            <div className="text-xs text-black/60">
              Use the header to see online users. Your name and color are used for strokes and labels.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
