"use client";

export function processSignatureImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (!img.width || !img.height) {
          return reject('Invalid image dimensions or empty signature image');
        }
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No canvas context');

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Thresholding: convert light pixels to transparent, dark pixels to black
        const threshold = 150; // 0-255. Adjust if needed.
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Grayscale luminance
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          if (luminance > threshold) {
            // Make background transparent
            data[i + 3] = 0; 
          } else {
            // Make signature dark/black
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 255; // Full opacity
          }
        }

        // Trim padding: scan for tight bounding box of signature strokes (non-transparent pixels)
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;
        let hasActivePixels = false;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];
            
            if (alpha > 0) { // non-transparent pixel found
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
              hasActivePixels = true;
            }
          }
        }

        let finalCanvas = canvas;
        if (hasActivePixels) {
          // Add a natural comfortable padding around the signature strokes
          const padding = 6;
          const trimMinX = Math.max(0, minX - padding);
          const trimMinY = Math.max(0, minY - padding);
          const trimMaxX = Math.min(canvas.width - 1, maxX + padding);
          const trimMaxY = Math.min(canvas.height - 1, maxY + padding);
          
          const trimWidth = trimMaxX - trimMinX + 1;
          const trimHeight = trimMaxY - trimMinY + 1;

          const trimCanvas = document.createElement('canvas');
          trimCanvas.width = trimWidth;
          trimCanvas.height = trimHeight;
          const trimCtx = trimCanvas.getContext('2d');
          
          if (trimCtx) {
            ctx.putImageData(imageData, 0, 0);
            trimCtx.drawImage(canvas, trimMinX, trimMinY, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);
            finalCanvas = trimCanvas;
          } else {
            ctx.putImageData(imageData, 0, 0);
          }
        } else {
          ctx.putImageData(imageData, 0, 0);
        }

        finalCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject('Failed to create blob from canvas');
          }
        }, 'image/png');
      };
      img.onerror = () => reject('Error loading image');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject('Error reading file');
    reader.readAsDataURL(file);
  });
}
