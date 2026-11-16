# Etapa 1: Compilacion de la aplicacion Angular
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Compilar la aplicacion para produccion
COPY . ./
RUN npm run build -- --configuration production

# Etapa 2: Servidor web ligero con Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Eliminar pagina por defecto de Nginx
RUN rm -rf ./*

# Copiar archivos compilados y configuracion Nginx personalizada
COPY --from=builder /app/dist/geovisionFrontEnd/browser ./
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
