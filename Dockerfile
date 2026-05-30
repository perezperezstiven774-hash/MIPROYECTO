FROM node:18-bullseye

# Instalar Python, yt-dlp y ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Crear enlace simbólico para 'python'
RUN ln -s /usr/bin/python3 /usr/bin/python

# Instalar yt-dlp con pip
RUN pip3 install yt-dlp --break-system-packages || pip3 install yt-dlp

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json PRIMERO
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