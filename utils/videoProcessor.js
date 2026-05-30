const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Función para limpiar URL (quitar listas de reproducción)
function limpiarUrl(url) {
  if (!url) return '';
  // Quitar ?list=... y &list=...
  return url.split('?')[0].split('&')[0];
}

// Función para limpiar nombre de archivo
function limpiarNombre(nombre) {
  if (!nombre) return "video";
  let limpio = nombre
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (limpio.length > 150) {
    limpio = limpio.substring(0, 150);
  }
  
  return limpio || "video";
}

// Verificar instalación de yt-dlp
async function verificarYtDlp() {
  try {
    const { stdout } = await execPromise('yt-dlp --version', { timeout: 10000 });
    console.log(`✅ yt-dlp versión: ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.error('❌ yt-dlp no está instalado correctamente');
    console.error('Instalando yt-dlp...');
    try {
      await execPromise('pip3 install yt-dlp');
      console.log('✅ yt-dlp instalado');
      return true;
    } catch (e) {
      console.error('❌ No se pudo instalar yt-dlp');
      return false;
    }
  }
}

// Verificar al iniciar
verificarYtDlp();

const getVideoInfo = async (url) => {
  // Limpiar URL primero
  const urlLimpia = limpiarUrl(url);
  console.log(`🔗 URL limpia: ${urlLimpia}`);
  
  try {
    console.log('🔍 Analizando video...');
    
    // Usar --get-title (más rápido y confiable)
    const { stdout } = await execPromise(`yt-dlp --get-title --no-warnings "${urlLimpia}"`, {
      maxBuffer: 1024 * 1024,
      timeout: 30000
    });
    
    const title = stdout.trim();
    console.log(`✅ Título: ${title}`);
    
    // Obtener ID para thumbnail
    let videoId = "";
    try {
      const { stdout: idOut } = await execPromise(`yt-dlp --get-id --no-warnings "${urlLimpia}"`, { timeout: 10000 });
      videoId = idOut.trim();
    } catch(e) {}
    
    // Obtener duración
    let duracion = "??";
    try {
      const { stdout: durOut } = await execPromise(`yt-dlp --get-duration --no-warnings "${urlLimpia}"`, { timeout: 10000 });
      duracion = durOut.trim();
    } catch(e) {}
    
    return {
      title: title,
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 'https://via.placeholder.com/320x180/1a1a2e/ffffff?text=Video',
      duration: duracion,
      availableFormats: ['mp4', 'mp3'],
      qualities: {
        video: ['360p', '480p', '720p', '1080p', 'WhatsApp (480p optimizado)'],
        audio: ['128kbps', '192kbps', '320kbps']
      }
    };
    
  } catch (error) {
    console.error('Error en getVideoInfo:', error.message);
    return {
      title: "Error al analizar video",
      thumbnail: "https://via.placeholder.com/320x180/1a1a2e/ffffff?text=⚠️+Error",
      duration: "??",
      availableFormats: ['mp4', 'mp3'],
      qualities: {
        video: ['360p', '480p', '720p', '1080p', 'WhatsApp (480p optimizado)'],
        audio: ['128kbps', '192kbps', '320kbps']
      }
    };
  }
};

const downloadVideo = async (url, format, quality) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Limpiar URL
      const urlLimpia = limpiarUrl(url);
      console.log(`🔗 Descargando de: ${urlLimpia}`);
      
      // Directorio de descargas
      const downloadsDir = path.join(__dirname, '../downloads');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }
      
      // Obtener título REAL
      let tituloReal = "";
      try {
        const { stdout } = await execPromise(`yt-dlp --get-title --no-warnings "${urlLimpia}"`, {
          maxBuffer: 1024 * 1024,
          timeout: 30000
        });
        tituloReal = stdout.trim();
        console.log(`📝 Título: "${tituloReal}"`);
      } catch (e) {
        console.log("No se pudo obtener título:", e.message);
        tituloReal = `descarga_${Date.now()}`;
      }
      
      const nombreLimpio = limpiarNombre(tituloReal);
      const filename = `${nombreLimpio}.${format}`;
      const filepath = path.join(downloadsDir, filename);
      
      console.log(`💾 Guardando: ${filename}`);
      
      let command = '';
      
      if (format === 'mp3') {
        const bitrate = quality.replace('kbps', '');
        command = `yt-dlp -x --audio-format mp3 --audio-quality ${bitrate} --no-playlist --embed-thumbnail --add-metadata -o "${filepath}" "${urlLimpia}"`;
        console.log('🎵 Descargando MP3...');
      } else if (quality.includes('WhatsApp')) {
        const tempFile = path.join(downloadsDir, `temp_${Date.now()}.mp4`);
        await execPromise(`yt-dlp -f "best[height<=480]" --no-playlist -o "${tempFile}" "${urlLimpia}"`, { timeout: 300000 });
        await execPromise(`ffmpeg -i "${tempFile}" -c:v libx264 -crf 28 -preset fast -vf "scale=854:480" -c:a aac -b:a 128k -movflags +faststart "${filepath}" -y`, { timeout: 300000 });
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } else {
        const height = quality.replace('p', '');
        command = `yt-dlp -f "bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]" --merge-output-format mp4 --no-playlist -o "${filepath}" "${urlLimpia}"`;
        console.log(`📥 Descargando ${quality}...`);
      }
      
      if (command) {
        await execPromise(command, { maxBuffer: 1024 * 1024 * 500, timeout: 600000 });
      }
      
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        console.log(`✅ DESCARGADO: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        
        resolve({
          success: true,
          downloadUrl: `/downloads/${encodeURIComponent(filename)}`,
          filename: filename,
          message: `✅ "${nombreLimpio}" descargado`
        });
      } else {
        throw new Error('Archivo no creado');
      }
      
    } catch (error) {
      console.error('❌ Error en downloadVideo:', error.message);
      
      // Fallback
      try {
        const downloadsDir = path.join(__dirname, '../downloads');
        const fallbackName = `descarga_${Date.now()}.${format === 'mp3' ? 'mp3' : 'mp4'}`;
        const fallbackPath = path.join(downloadsDir, fallbackName);
        await execPromise(`yt-dlp -f best -o "${fallbackPath}" "${limpiarUrl(url)}"`, { timeout: 300000 });
        
        resolve({
          success: true,
          downloadUrl: `/downloads/${fallbackName}`,
          filename: fallbackName,
          message: "✅ Descargado"
        });
      } catch (fallbackError) {
        reject(new Error('Error en la descarga: ' + fallbackError.message));
      }
    }
  });
};

module.exports = { getVideoInfo, downloadVideo };