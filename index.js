const { Client } = require('@whatsapp/web.js');
const redis = require('redis');

// Conexión a Redis (esto se configurará como variable de entorno en Render)
const redisUrl = process.env.REDIS_URL;
const client = redis.createClient({
  url: redisUrl,
});

client.connect().then(() => {
  console.log('Conectado a Redis');
}).catch((err) => {
  console.error('Error al conectar a Redis:', err);
});

// Crear cliente de WhatsApp
const whatsappClient = new Client({
  puppeteer: {
    headless: true,  // Configuración de Puppeteer para usar el navegador sin interfaz gráfica
  },
});

// Evento de QR
whatsappClient.on('qr', (qr) => {
  console.log('Escanea este código QR para iniciar sesión:', qr);
});

// Evento de autenticación
whatsappClient.on('authenticated', (session) => {
  console.log('Sesión autenticada');
  client.set('whatsapp-session', JSON.stringify(session), (err) => {
    if (err) {
      console.error('Error al guardar la sesión en Redis:', err);
    } else {
      console.log('Sesión guardada correctamente en Redis');
    }
  });
});

// Evento cuando el cliente está listo
whatsappClient.on('ready', () => {
  console.log('Cliente listo');
});

// Iniciar el cliente de WhatsApp
whatsappClient.initialize();
