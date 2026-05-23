const fs = require('fs');
const path = require('path');
const https = require('https');

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1'
];
const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const dir = path.join(__dirname, 'public', 'models');
fs.mkdirSync(dir, { recursive: true });

models.forEach(file => {
  const dest = path.join(dir, file);
  https.get(baseUrl + file, (response) => {
    response.pipe(fs.createWriteStream(dest));
    console.log(`Downloaded ${file}`);
  }).on('error', console.error);
});
