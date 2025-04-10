const originalCanvas = document.getElementById('originalCanvas');
const filteredCanvas = document.getElementById('filteredCanvas');
const origCtx = originalCanvas.getContext('2d');
const filtCtx = filteredCanvas.getContext('2d');

let originalImageData = null;
let currentFilter = null;
let img = new Image();
let intensity = 1;
let brightness = 0;
let contrast = 1;

function adjustCanvasSizes(width, height) {
  originalCanvas.width = filteredCanvas.width = width;
  originalCanvas.height = filteredCanvas.height = height;
}

document.getElementById('upload').addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader();
    reader.onload = function(event) {
      img.onload = function() {
        const maxWidth = 600;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;
        const scaleFactor = Math.min(maxWidth / width, maxHeight / height, 1);
        width = width * scaleFactor;
        height = height * scaleFactor;
        
        adjustCanvasSizes(width, height);
        origCtx.drawImage(img, 0, 0, width, height);
        filtCtx.drawImage(img, 0, 0, width, height);
        originalImageData = origCtx.getImageData(0, 0, width, height);
        applyAdjustments();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
  }
});

// Slider event listeners
const intensitySlider = document.getElementById('intensity');
const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');

intensitySlider.addEventListener('input', function(e) {
  intensity = parseFloat(e.target.value);
  document.getElementById('intensityValue').textContent = intensity.toFixed(1);
  applyAdjustments();
});

brightnessSlider.addEventListener('input', function(e) {
  brightness = parseInt(e.target.value);
  document.getElementById('brightnessValue').textContent = brightness;
  applyAdjustments();
});

contrastSlider.addEventListener('input', function(e) {
  contrast = parseFloat(e.target.value);
  document.getElementById('contrastValue').textContent = contrast.toFixed(1);
  applyAdjustments();
});

function resetFiltered() {
  if (originalImageData) {
    filtCtx.putImageData(originalImageData, 0, 0);
    currentFilter = null;
    applyAdjustments();
  }
}

function handleFilter(filter) {
  if (currentFilter === filter) {
    console.log(`${filter} filter is already applied.`);
    return;
  }
  currentFilter = filter;
  applyAdjustments();
}

function applyFilter(imageData, filter) {
  let output = imageData;
  switch (filter) {
    case 'blur':
      output = convolution(imageData, [
        1/9, 1/9, 1/9,
        1/9, 1/9, 1/9,
        1/9, 1/9, 1/9
      ]);
      break;
    case 'sharpen':
      output = convolution(imageData, [
         0, -1,  0,
        -1,  5, -1,
         0, -1,  0
      ]);
      break;
    case 'invert':
      output = invert(imageData);
      break;
    case 'smooth':
      output = convolution(imageData, [
        1/9, 1/9, 1/9,
        1/9, 1/9, 1/9,
        1/9, 1/9, 1/9
      ]);
      break;
    case 'grayscale':
      output = grayscale(imageData);
      break;
  }
  return output;
}

function applyAdjustments() {
  if (!originalImageData) return;
  
  // Create a working copy from original
  let imageData = filtCtx.createImageData(originalImageData.width, originalImageData.height);
  imageData.data.set(new Uint8ClampedArray(originalImageData.data));
  let data = imageData.data;
  
  // Apply adjustments
  for (let i = 0; i < data.length; i += 4) {
    // Brightness
    data[i] = Math.min(255, Math.max(0, data[i] + brightness));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
    
    // Contrast
    let factor = contrast;
    data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * factor) + 128));
    data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * factor) + 128));
    data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * factor) + 128));
    
    // Intensity
    data[i] = Math.min(255, Math.max(0, data[i] * intensity));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * intensity));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * intensity));
  }
  
  // Apply filter if exists
  if (currentFilter) {
    imageData = applyFilter(imageData, currentFilter);
  }
  
  filtCtx.putImageData(imageData, 0, 0);
}

function invert(imageData) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  return imageData;
}

function grayscale(imageData) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = data[i + 1] = data[i + 2] = avg;
  }
  return imageData;
}

function convolution(imageData, kernel) {
  const side = Math.round(Math.sqrt(kernel.length));
  const halfSide = Math.floor(side / 2);
  const src = imageData.data;
  const sw = imageData.width;
  const sh = imageData.height;
  const output = filtCtx.createImageData(sw, sh);
  const dst = output.data;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const dstOff = (y * sw + x) * 4;
      let r = 0, g = 0, b = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = y + cy - halfSide;
          const scx = x + cx - halfSide;
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            const srcOff = (scy * sw + scx) * 4;
            const wt = kernel[cy * side + cx];
            r += src[srcOff] * wt;
            g += src[srcOff + 1] * wt;
            b += src[srcOff + 2] * wt;
          }
        }
      }
      dst[dstOff] = Math.min(255, Math.max(0, r));
      dst[dstOff + 1] = Math.min(255, Math.max(0, g));
      dst[dstOff + 2] = Math.min(255, Math.max(0, b));
      dst[dstOff + 3] = src[dstOff + 3];
    }
  }
  return output;
}

function downloadFiltered() {
  if (!originalImageData) return alert('Please upload an image first!');
  const link = document.createElement('a');
  link.download = 'filtered_image.png';
  link.href = filteredCanvas.toDataURL('image/png');
  link.click();
}
