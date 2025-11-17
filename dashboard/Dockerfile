FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar código del dashboard
COPY . .

# Exponer puerto del dashboard
EXPOSE 3002

# Build de la aplicación React
RUN npm run build

# Servir aplicación buildeda
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3002"]