let currentVideoInfo = null;

// Elementos DOM
const urlInput = document.getElementById('urlInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loading = document.getElementById('loading');
const videoInfo = document.getElementById('videoInfo');
const formatSection = document.getElementById('formatSection');
const progressSection = document.getElementById('progressSection');
const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('videoTitle');
const duration = document.getElementById('duration');
const formatSelect = document.getElementById('formatSelect');
const qualitySelect = document.getElementById('qualitySelect');
const downloadBtn = document.getElementById('downloadBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Actualizar calidades según formato
function updateQualities() {
  if (!currentVideoInfo) return;
  
  const format = formatSelect.value;
  const isVideo = ['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(format);
  
  // Limpiar y llenar el select de calidades
  qualitySelect.innerHTML = '';
  
  let qualities = [];
  if (isVideo) {
    qualities = currentVideoInfo.qualities.video || ['360p', '480p', '720p', '1080p', 'WhatsApp (480p optimizado)'];
  } else {
    qualities = currentVideoInfo.qualities.audio || ['128kbps', '192kbps', '320kbps'];
  }
  
  qualities.forEach(q => {
    const option = document.createElement('option');
    option.value = q;
    option.textContent = q;
    qualitySelect.appendChild(option);
  });
}

// Al cambiar formato, actualizar calidades
formatSelect.addEventListener('change', () => {
  updateQualities();
});

// Mostrar tip cuando se selecciona la opción de WhatsApp
qualitySelect.addEventListener('change', () => {
  const whatsappTip = document.getElementById('whatsappTip');
  if (whatsappTip) {
    if (qualitySelect.value === 'WhatsApp (480p optimizado)') {
      whatsappTip.style.display = 'flex';
    } else {
      whatsappTip.style.display = 'none';
    }
  }
});

// Analizar video
analyzeBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    alert('❌ Por favor, ingresa una URL válida');
    return;
  }
  
  loading.classList.remove('hidden');
  videoInfo.classList.add('hidden');
  formatSection.classList.add('hidden');
  
  // Mostrar mensaje de espera
  const loadingMsg = document.querySelector('#loading p');
  if (loadingMsg) {
    loadingMsg.textContent = '🔍 Analizando video (puede tomar 5-10 segundos)...';
  }
  
  try {
    const response = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    currentVideoInfo = data;
    thumbnail.src = data.thumbnail;
    videoTitle.textContent = data.title;
    duration.textContent = data.duration;
    
    videoInfo.classList.remove('hidden');
    updateQualities();
    formatSection.classList.remove('hidden');
    loading.classList.add('hidden');
    
    // Restaurar mensaje
    if (loadingMsg) loadingMsg.textContent = 'Analizando video...';
    
  } catch (error) {
    loading.classList.add('hidden');
    alert('❌ Error al analizar el video: ' + error.message);
    if (loadingMsg) loadingMsg.textContent = 'Analizando video...';
  }
});

// Descargar video - SIN VENTANAS EMERGENTES
downloadBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  const format = formatSelect.value;
  const quality = qualitySelect.value;
  
  if (!url) {
    alert('❌ Primero analiza un video');
    return;
  }
  
  if (!quality) {
    alert('❌ Selecciona una calidad');
    return;
  }
  
  progressSection.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  
  // Mostrar mensaje de progreso
  const progressMsg = document.querySelector('#progressSection p');
  if (progressMsg) {
    if (quality === 'WhatsApp (480p optimizado)') {
      progressMsg.textContent = '📱 Optimizando para WhatsApp... esto puede tomar unos minutos';
    } else {
      progressMsg.textContent = '⏳ Descargando... esto puede tomar varios minutos';
    }
  }
  
  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format, quality })
    });
    
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    // Simular progreso mientras se prepara la descarga
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${progress}%`;
      
      if (progress >= 100) {
        clearInterval(interval);
        
        // Descargar el archivo
        fetch(data.downloadUrl)
          .then(res => {
            if (!res.ok) throw new Error('Error al obtener el archivo');
            return res.blob();
          })
          .then(blob => {
            const link = document.createElement('a');
            const downloadUrl = URL.createObjectURL(blob);
            link.href = downloadUrl;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            
            addToHistory(data.filename, format, quality);
            setTimeout(() => {
              progressSection.classList.add('hidden');
              if (progressMsg) progressMsg.textContent = '';
            }, 500);
          })
          .catch(err => {
            // ❌ SIN ALERT - Solo mostrar en consola
            console.error('❌ Error al descargar:', err.message);
            progressSection.classList.add('hidden');
            if (progressMsg) progressMsg.textContent = '';
          });
      }
    }, 300);
    
  } catch (error) {
    // ❌ SIN ALERT - Solo mostrar en consola
    console.error('❌ Error en la descarga:', error.message);
    progressSection.classList.add('hidden');
    const progressMsg = document.querySelector('#progressSection p');
    if (progressMsg) progressMsg.textContent = '';
  }
});

// Historial
function addToHistory(filename, format, quality) {
  const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
  const newItem = {
    id: Date.now(),
    filename,
    format,
    quality,
    date: new Date().toLocaleString()
  };
  
  history.unshift(newItem);
  localStorage.setItem('downloadHistory', JSON.stringify(history.slice(0, 10)));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
  const historyList = document.getElementById('historyList');
  
  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-history">No hay descargas recientes</p>';
    return;
  }
  
  historyList.innerHTML = history.map(item => `
    <div class="history-item">
      <div>
        <strong>${item.filename.length > 50 ? item.filename.substring(0, 50) + '...' : item.filename}</strong><br>
        <small>${item.format.toUpperCase()} - ${item.quality} - ${item.date}</small>
      </div>
      <button onclick="alert('📁 Archivo: ${item.filename}')">
        <i class="fas fa-info-circle"></i>
      </button>
    </div>
  `).join('');
}

// Cargar historial al inicio
renderHistory();

// Ocultar tooltip de WhatsApp al inicio
const whatsappTip = document.getElementById('whatsappTip');
if (whatsappTip) {
  whatsappTip.style.display = 'none';
}