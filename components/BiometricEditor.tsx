"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, RotateCw, Check, X, RefreshCw } from 'lucide-react';

interface BiometricEditorProps {
  imageSrc: string;
  aspectRatio: number; // e.g. 1 for passport photo (1:1), 3 for signature (3:1)
  title: string;
  onSave: (croppedImageBlob: Blob) => void;
  onClose: () => void;
}

export default function BiometricEditor({ imageSrc, aspectRatio, title, onSave, onClose }: BiometricEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      // Reset values
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw canvas whenever zoom, rotation, offset, or image changes
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We want the canvas size to be fixed high-quality dimensions
    // Passport photo: 400x400. Signature: 600x200
    const canvasWidth = aspectRatio === 1 ? 400 : 600;
    const canvasHeight = aspectRatio === 1 ? 400 : 200;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Transparent or white background depending on signature/photo
    if (aspectRatio === 1) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.save();
    
    // Move origin to the center of the canvas to apply transformations
    ctx.translate(canvasWidth / 2 + offset.x, canvasHeight / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Calculate scaling factor to fit the image reasonably
    const imgRatio = image.width / image.height;
    let drawWidth = canvasWidth;
    let drawHeight = canvasHeight;

    if (aspectRatio === 1) {
      // For square, fit the smaller dimension
      if (imgRatio > 1) {
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * imgRatio;
      } else {
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imgRatio;
      }
    } else {
      // For wide signatures
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
    }

    // Apply scale/zoom
    const finalWidth = drawWidth * zoom;
    const finalHeight = drawHeight * zoom;

    ctx.drawImage(
      image,
      -finalWidth / 2,
      -finalHeight / 2,
      finalWidth,
      finalHeight
    );

    ctx.restore();

  }, [image, zoom, rotation, offset, aspectRatio]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/png');
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        ref={containerRef}
        className="premium-card w-full max-w-2xl bg-white shadow-2xl rounded-2xl overflow-hidden animate-slide-up flex flex-col"
        style={{ padding: '0px' }}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-extrabold text-[var(--primary-color)]">{title}</h3>
            <p className="text-xs text-gray-500 font-medium">Position, rotate, and scale your asset</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-8 bg-gray-100 flex items-center justify-center min-h-[300px] select-none relative overflow-hidden">
          <div 
            className="relative cursor-move bg-white shadow-inner border border-gray-200 rounded-lg overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            style={{
              width: aspectRatio === 1 ? '300px' : '450px',
              height: aspectRatio === 1 ? '300px' : '150px',
            }}
          >
            <canvas 
              ref={canvasRef} 
              className="w-full h-full object-contain pointer-events-none"
            />
            {/* Guide overlay lines */}
            <div className="absolute inset-0 pointer-events-none border border-white/40 flex items-center justify-center">
              <div className="w-full h-[1px] bg-white/25 absolute"></div>
              <div className="h-full w-[1px] bg-white/25 absolute"></div>
              {aspectRatio === 1 && (
                <div className="w-2/3 h-2/3 rounded-full border border-dashed border-white/60 absolute"></div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-white border-t border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 w-full sm:w-2/3">
              <ZoomIn size={18} className="text-gray-400 shrink-0" />
              <input 
                type="range" 
                min="0.5" 
                max="4" 
                step="0.05"
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--primary-color)]"
              />
              <span className="text-xs font-bold text-gray-500 w-8 shrink-0">{Math.round(zoom * 100)}%</span>
            </div>

            {/* Editing Buttons */}
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button 
                onClick={handleRotate}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-sm font-semibold text-[#1e5fb8] dark:border-blue-800/80 dark:bg-blue-950/20 dark:hover:bg-blue-900/40 dark:text-blue-400 rounded-lg transition"
              >
                <RotateCw size={15} />
                Rotate 90°
              </button>
              <button 
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-sm font-semibold text-[#1e5fb8] dark:border-blue-800/80 dark:bg-blue-950/20 dark:hover:bg-blue-900/40 dark:text-blue-400 rounded-lg transition"
              >
                <RefreshCw size={15} />
                Reset
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button 
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#1e5fb8] dark:text-[#1e5fb8] border border-[#1e5fb8]/20 hover:border-[#1e5fb8]/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(30,95,184,0.25)] hover:shadow-[0_6px_20px_rgba(30,95,184,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-[#1e5fb8]/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
              style={{
                backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                backgroundColor: '#1e5fb8'
              }}
            >
              <Check size={14} />
              Apply Crop & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
