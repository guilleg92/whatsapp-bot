const { Client, LocalAuth } = require('whatsapp-web.js');
const redis = require('redis');
const fs = require('fs');
const moment = require('moment-timezone');
const config = require('./config.json');

// Conexión a Redis
const redisClient = redis.createClient({
  url: 'redis://red-ctqi1hbtq21c73a1s6ug:6379'
});
redisClient.connect()
  .then(() => {
    console.log('Conectado a Redis');
  })
  .catch((err) => {
    console.error('Error de conexión a Redis:', err);
  });

// Crear el cliente de WhatsApp con autenticación local (usando Redis para la sesión)
const client = new Client({
  authStrategy: new LocalAuth(),  // Utiliza LocalAuth para guardar la sesión
  puppeteer: { 
    headless: false,  // Cambiar a false para permitir la visualización del navegador y QR
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Para evitar problemas de sandboxing en algunos entornos
  },
  restartOnAuthFail: true  // Reinicia el cliente si la autenticación falla
});

// Manejo de eventos del cliente de WhatsApp
client.on('qr', (qr) => {
  console.log('Escanea el código QR con tu WhatsApp:', qr); // Aquí se debería generar el QR visualmente
});

client.on('ready', () => {
  console.log('¡Bot está listo y autenticado!');
  sendMessageAtScheduledTime();  // Ahora que el bot está listo, podemos enviar el mensaje
});

client.on('authenticated', () => {
  console.log('Sesión autenticada correctamente.');
});

client.on('auth_failure', () => {
  console.log('Fallo en la autenticación. Intenta escanear el QR nuevamente.');
});

client.on('message', (msg) => {
  if (msg.body === '¡Hola!') {
    msg.reply('¡Hola, cómo estás!');
  }
});

// Función para enviar el mensaje a la hora programada
function sendMessageAtScheduledTime() {
  const now = moment.tz("Europe/Madrid");
  const targetTime = moment.tz(config.scheduledTime, "Europe/Madrid");
  const groupName = config.groupName;
  const message = config.message;

  if (now.isBefore(targetTime)) {
    const delay = targetTime.diff(now, 'milliseconds');
    console.log(`Esperando hasta las ${targetTime.format('HH:mm')} para enviar el mensaje...`);
    setTimeout(() => {
      sendMessage(groupName, message);
    }, delay);
  } else {
    sendMessage(groupName, message);
  }
}

// Función para enviar el mensaje al grupo
async function sendMessage(groupName, message) {
  try {
    const chats = await client.getChats();
    const group = chats.find(chat => chat.name === groupName);

    if (group) {
      console.log(`Grupo encontrado: ${groupName}`);
      await group.sendMessage(message);
      console.log(`Mensaje enviado a las ${moment().format('HH:mm')}`);
    } else {
      console.log(`No se encontró el grupo: ${groupName}`);
    }
  } catch (error) {
    console.error('Error al enviar el mensaje:', error);
  }
}

// Inicializar el cliente de WhatsApp
client.initialize();

// Crear un servidor HTTP para Render (necesario para detectar el puerto)
const http = require('http');
const port = process.env.PORT || 3000;  // Usa el puerto proporcionado por Render o el puerto 3000 por defecto

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running');
}).listen(port, () => {
  console.log(`Bot is listening on port ${port}`);
});
