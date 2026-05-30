FROM node:18-bullseye

# Instalar yt-dlp y ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip3 install yt-dlp --break-system-packages || pip3 install yt-dlp

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json PRIMERO (importante)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Crear directorio para descargas
RUN mkdir -p downloads

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]