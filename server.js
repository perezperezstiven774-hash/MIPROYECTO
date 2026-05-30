const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const downloadRoutes = require('./routes/download');

const app = express();
// Usar el puerto que asigna SnapDeploy o 3000 por defecto
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Crear carpeta downloads si no existe
const downloadDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

// Limpiar archivos viejos cada hora (mayores a 1 hora)
setInterval(() => {
  const now = Date.now();
  fs.readdir(downloadDir, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const filePath = path.join(downloadDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > 3600000) { // 1 hora
          fs.unlink(filePath, () => {});
          console.log(`🧹 Eliminado archivo viejo: ${file}`);
        }
      });
    });
  });
}, 3600000);

// Servir archivos descargados
app.use('/downloads', express.static(downloadDir));

// Rutas API
app.use('/api', downloadRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de salud para SnapDeploy
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🎬 VideoMaster Downloader listo para usar`);
});