const express = require('express');
const router = express.Router();
const { getVideoInfo, downloadVideo } = require('../utils/videoProcessor');

// Obtener información del video
router.post('/info', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    const info = await getVideoInfo(url);
    res.json(info);
  } catch (error) {
    console.error('Error en /info:', error.message);
    // Siempre devolver algo para que la UI no se rompa
    res.json({
      title: `Video (verifica que yt-dlp esté instalado)`,
      thumbnail: 'https://via.placeholder.com/480x360/1a1a2e/ffffff?text=⚠️+Procesando',
      duration: '0:00',
      availableFormats: ['mp4', 'mp3'],
      qualities: {
        video: ['360p', '480p', '720p', '1080p', 'WhatsApp (480p optimizado)'],
        audio: ['128kbps', '192kbps', '320kbps']
      }
    });
  }
});

// Procesar descarga
router.post('/download', async (req, res) => {
  const { url, format, quality } = req.body;
  
  if (!url || !format || !quality) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  try {
    const result = await downloadVideo(url, format, quality);
    res.json(result);
  } catch (error) {
    console.error('Error en /download:', error.message);
    res.status(500).json({ error: 'Error al procesar la descarga: ' + error.message });
  }
});

module.exports = router;