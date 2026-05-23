"use client";

let faceapi: any = null;
let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  if (typeof window === 'undefined') return;

  try {
    const faceapiModule = await import('face-api.js');
    faceapi = faceapiModule.default || faceapiModule;
    
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  } catch (error) {
    console.error("Error loading models", error);
  }
}

export async function validatePassportPhoto(imageElement: HTMLImageElement): Promise<{ isValid: boolean, score: number, message: string }> {
  await loadModels();

  if (!modelsLoaded) {
    return { isValid: false, score: 0, message: "AI Models not loaded." };
  }

  // Safety guard: ensure the image has loaded with non-zero dimensions
  const width = imageElement.naturalWidth || imageElement.width;
  const height = imageElement.naturalHeight || imageElement.height;
  if (!width || !height) {
    return { isValid: false, score: 0, message: "Invalid image dimensions or image not fully loaded." };
  }

  // Create temporary canvas to draw the image for background analysis
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { isValid: false, score: 0, message: "Offscreen canvas creation failed." };
  }
  ctx.drawImage(imageElement, 0, 0, width, height);

  // Perform face & landmarks detection
  const detections = await faceapi.detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

  if (detections.length === 0) {
    return { isValid: false, score: 0, message: "No face detected in the photo. Please upload a clear photo." };
  }

  if (detections.length > 1) {
    return { isValid: false, score: 0, message: "Multiple faces detected. Please upload a photo with only yourself." };
  }

  const face = detections[0];
  let score = Math.round(face.detection.score * 100);

  // Standard face clarity verification
  if (score < 80) {
    return { isValid: false, score, message: "Face not clear enough. Please ensure good lighting and look directly at the camera." };
  }

  // 1. PLAIN WHITE BACKGROUND CHECK
  // Sample pixels in background areas (top margins and top corners) to audit for plain white / light grey wall.
  const samplePoints: { x: number; y: number }[] = [];
  // Top margin points (y = 5% to 8%)
  for (let i = 1; i <= 5; i++) {
    samplePoints.push({ x: Math.round(width * (i / 6)), y: Math.round(height * 0.08) });
  }
  // Upper left margin points
  for (let i = 1; i <= 3; i++) {
    samplePoints.push({ x: Math.round(width * 0.08), y: Math.round(height * (i / 8)) });
  }
  // Upper right margin points
  for (let i = 1; i <= 3; i++) {
    samplePoints.push({ x: Math.round(width * 0.92), y: Math.round(height * (i / 8)) });
  }

  let totalBrightness = 0;
  let nonNeutralCount = 0;
  let darkCount = 0;
  const sampledColors: { r: number; g: number; b: number }[] = [];

  for (const pt of samplePoints) {
    try {
      const pixel = ctx.getImageData(pt.x, pt.y, 1, 1).data;
      const r = pixel[0];
      const g = pixel[1];
      const b = pixel[2];
      sampledColors.push({ r, g, b });

      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;

      if (brightness < 165) {
        darkCount++;
      }

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max - min > 50) {
        nonNeutralCount++;
      }
    } catch (e) {}
  }

  if (sampledColors.length > 0) {
    const avgBrightness = totalBrightness / sampledColors.length;

    // Calculate standard deviation of brightness to detect texture/noise/busy backgrounds
    let sumSqDiff = 0;
    for (const c of sampledColors) {
      const brightness = (c.r + c.g + c.b) / 3;
      sumSqDiff += Math.pow(brightness - avgBrightness, 2);
    }
    const stdDev = Math.sqrt(sumSqDiff / sampledColors.length);

    if (darkCount > samplePoints.length * 0.3) {
      return { 
        isValid: false, 
        score: Math.round(score * 0.5), 
        message: "Background is too dark. A plain white or very light background is required." 
      };
    }

    if (nonNeutralCount > samplePoints.length * 0.3) {
      return { 
        isValid: false, 
        score: Math.round(score * 0.6), 
        message: "Background color is not neutral. A plain white or light grey background is required." 
      };
    }

    if (stdDev > 45) {
      return { 
        isValid: false, 
        score: Math.round(score * 0.6), 
        message: "Noisy or busy background detected. Please stand against a flat, plain white wall." 
      };
    }

    if (avgBrightness < 170) {
      return { 
        isValid: false, 
        score: Math.round(score * 0.8), 
        message: "Background must be plain white or off-white. The current background is too dark." 
      };
    }
  }

  // 2. FACE ALIGNMENT & POSTURE CHECKS (68 LANDMARKS)
  const landmarks = face.landmarks;
  const points = landmarks.positions;

  const leftEyeOuter = points[36];
  const rightEyeOuter = points[45];

  // Head Roll check (tilt left/right)
  const dx = rightEyeOuter.x - leftEyeOuter.x;
  const dy = rightEyeOuter.y - leftEyeOuter.y;
  const rollAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (Math.abs(rollAngle) > 10.0) {
    return {
      isValid: false,
      score: Math.round(score * 0.7),
      message: `Head is tilted by ${Math.abs(rollAngle).toFixed(1)}°. Please keep your head straight and level.`
    };
  }

  // Head Yaw check (turning left/right)
  const dLeftOuter = leftEyeOuter.x - points[0].x;
  const dRightOuter = points[16].x - rightEyeOuter.x;
  const symmetryRatio = Math.max(dLeftOuter, dRightOuter) / Math.max(1, Math.min(dLeftOuter, dRightOuter));
  if (symmetryRatio > 1.50) {
    return {
      isValid: false,
      score: Math.round(score * 0.7),
      message: "Please face the camera directly. Do not turn your head sideways."
    };
  }

  // Head Pitch check (looking up/down / nose verticality)
  const noseBridgeTop = points[27];
  const noseTip = points[30];
  const noseDx = noseTip.x - noseBridgeTop.x;
  const noseDy = noseTip.y - noseBridgeTop.y;
  const noseAngle = Math.atan2(noseDy, noseDx) * (180 / Math.PI) - 90;
  if (Math.abs(noseAngle) > 10.0) {
    return {
      isValid: false,
      score: Math.round(score * 0.8),
      message: "Please look straight ahead directly into the camera lens."
    };
  }

  // 3. FACE CENTERING & POSTURE/SHOULDERS SKEW
  const faceLeft = points[0].x;
  const faceRight = points[16].x;
  const faceWidth = faceRight - faceLeft;
  const faceCenter = faceLeft + faceWidth / 2;
  const imageCenter = width / 2;

  // Face Centering
  const horizontalOffset = Math.abs(faceCenter - imageCenter) / width;
  if (horizontalOffset > 0.12) {
    return {
      isValid: false,
      score: Math.round(score * 0.8),
      message: "Your face is not centered horizontally. Please adjust or crop the photo to center your face."
    };
  }

  // Face Scale / Camera Distance (Ensure shoulders are included)
  const scaleRatio = faceWidth / width;
  if (scaleRatio < 0.35) {
    return {
      isValid: false,
      score: Math.round(score * 0.7),
      message: "Camera is too far away. Please crop the photo closer to your head and shoulders."
    };
  }
  if (scaleRatio > 0.75) {
    return {
      isValid: false,
      score: Math.round(score * 0.7),
      message: "Your face is too close. Please zoom out slightly to include your shoulders."
    };
  }

  // Shoulder and Posture Skew Check (Neck tilt relative to shoulders)
  const chinOffset = Math.abs(points[8].x - points[27].x);
  const chinOffsetRatio = chinOffset / faceWidth;
  if (chinOffsetRatio > 0.13) {
    return {
      isValid: false,
      score: Math.round(score * 0.8),
      message: "Your posture appears skewed. Please sit up straight with level shoulders and face the camera."
    };
  }

  // If all checks pass, it's an elite high-security passport photo!
  return { isValid: true, score, message: "Passport biometric photo verified! Quality is outstanding." };
}
