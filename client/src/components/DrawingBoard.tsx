import React, { useRef, useEffect, useState } from 'react';
import { Trash2, Undo, Palette, Sliders } from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
}

const PRESET_COLORS = [
  '#f87171', // Red-400
  '#f59e0b', // Amber-500
  '#10b981', // Emerald-500
  '#3b82f6', // Blue-500
  '#8b5cf6', // Violet-500
  '#ec4899', // Pink-500
  '#f3f4f6', // White/Gray-100
];

export const DrawingBoard: React.FC = () => {
  const { canvasStrokes, sendCanvasDraw, sendCanvasClear, sendCanvasUndo } = useWebRTC();
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#8b5cf6'); // purple-500
  const [brushSize, setBrushSize] = useState(4);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const lastEmitTimeRef = useRef<number>(0);

  // Extracted canvas redrawing logic
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvasStrokes.forEach((stroke: Stroke) => {
      if (stroke.points.length < 1) return;

      // Skip redrawing our own active drawing stroke in real-time to prevent overlapping/flicker
      if (isDrawing && currentStrokeRef.current && stroke.id === currentStrokeRef.current.id) {
        return;
      }

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const startX = stroke.points[0].x * canvas.width;
      const startY = stroke.points[0].y * canvas.height;
      ctx.moveTo(startX, startY);

      stroke.points.forEach((pt: Point) => {
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  };

  // Redraw canvas whenever drawing state is updated from context
  useEffect(() => {
    drawCanvas();
  }, [canvasStrokes, isDrawing]);

  // Adjust canvas pixel resolution to display client boundary size
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Re-render drawing strokes instantly after dimension recalculations to prevent blank canvas
      drawCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasStrokes]);

  // MOUSE & TOUCH EVENT HANDLERS
  const startDrawing = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width; // Normalize coordinate ratio
    const y = (clientY - rect.top) / rect.height;

    setIsDrawing(true);
    lastEmitTimeRef.current = Date.now();
    
    const newStroke: Stroke = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      points: [{ x, y }],
      color: brushColor,
      size: brushSize,
    };
    
    currentStrokeRef.current = newStroke;
    sendCanvasDraw(newStroke);
  };

  const draw = (clientX: number, clientY: number) => {
    if (!isDrawing || !currentStrokeRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    // Draw the segment locally and immediately for butter-smooth 60fps drawing response
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const prevPoints = currentStrokeRef.current.points;
      const prevPt = prevPoints[prevPoints.length - 1];
      
      ctx.moveTo(prevPt.x * canvas.width, prevPt.y * canvas.height);
      ctx.lineTo(clientX - rect.left, clientY - rect.top);
      ctx.stroke();
    }

    const updatedStroke = {
      ...currentStrokeRef.current,
      points: [...currentStrokeRef.current.points, { x, y }]
    };

    currentStrokeRef.current = updatedStroke;

    // Throttle network broadcasts (Socket.io/WebRTC) to at most once every 40ms to protect bandwidth
    const now = Date.now();
    if (now - lastEmitTimeRef.current > 40) {
      sendCanvasDraw(updatedStroke);
      lastEmitTimeRef.current = now;
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentStrokeRef.current) {
      // Sync final completed stroke to make sure all endpoints are perfectly captured
      sendCanvasDraw(currentStrokeRef.current);
    }
    setIsDrawing(false);
    currentStrokeRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startDrawing(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    draw(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startDrawing(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    draw(touch.clientX, touch.clientY);
  };

  // TOOLBAR UTILS
  const handleUndo = () => {
    if (canvasStrokes.length === 0) return;
    // Remove last stroke
    const remainingStrokes = [...canvasStrokes];
    remainingStrokes.pop();
    sendCanvasUndo(remainingStrokes);
  };

  const handleClear = () => {
    sendCanvasClear();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl overflow-hidden border border-white/10 shadow-xl select-none">
      
      {/* Header toolbar */}
      <div className="px-6 py-4 bg-slate-900/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg font-display text-white">Collaborative Whiteboard 🎨</h3>
          <p className="text-xs text-slate-400">Doodle together synchronously in real time.</p>
        </div>

        {/* Action button tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={canvasStrokes.length === 0}
            className="p-2.5 rounded-lg glass-panel-light hover:bg-white/10 border border-white/10 text-white cursor-pointer transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            title="Undo last stroke"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={handleClear}
            disabled={canvasStrokes.length === 0}
            className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            title="Clear Drawing canvas"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Interactive Drawing Canvas area */}
      <div className="flex-1 min-h-[350px] relative bg-slate-900">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />

        {/* Sync Indicator overlay */}
        <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-950/70 border border-purple-500/25 text-purple-300 backdrop-blur-md">
          {canvasStrokes.length} Strokes Sync'd
        </div>
      </div>

      {/* Bottom control panel */}
      <div className="px-6 py-4 bg-slate-900/40 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Colors selector tray */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Palette size={14} className="text-purple-400" />
            Color:
          </span>
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setBrushColor(color)}
                className={`w-6 h-6 rounded-full cursor-pointer transition-transform border border-black/20 ${
                  brushColor === color ? 'scale-125 ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            
            {/* Custom hex color selector */}
            <div className="relative w-6 h-6 rounded-full border border-white/20 overflow-hidden hover:scale-110 cursor-pointer">
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer border-none p-0"
              />
            </div>
          </div>
        </div>

        {/* Brush size slider widget */}
        <div className="flex items-center gap-4 w-full sm:w-auto max-w-xs">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
            <Sliders size={14} className="text-purple-400" />
            Brush Size: {brushSize}px
          </span>
          <input
            type="range"
            min={1}
            max={20}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>
    </div>
  );
};
export default DrawingBoard;



