const { Client, RemoteAuth } = require('whatsapp-web.js');
const RedisStore = require('whatsapp-web.js/src/authStrategies/Stores/RedisStore');
const { createClient } = require('redis');
const moment = require('moment-timezone');
const fs = require('fs');
const config = require('./config.json');

// Configuración de Redis
const redisClient = createClient({
  url: 'redis://red-ctqi1hbtq21c73a1s6ug:6379'
});

redisClient.connect()
  .then(() => console.log('Conectado a Redis'))
  .catch((err) => console.error('Error al conectar a Redis:', err));

// Crear cliente de WhatsApp
const client = new Client({
  authStrategy: new RemoteAuth({
    store: new RedisStore(redisClient), // Configuración del store
    client: redisClient,
    backupSyncIntervalMs: 60000 // Intervalo de sincronización en milisegundos
  }),
  puppeteer: { headless: true },
  restartOnAuthFail: true
});

// Eventos del cliente de WhatsApp
client.on('qr', (qr) => {
  console.log('Escanea este código QR para iniciar sesión:', qr);
});

client.on('ready', () => {
  console.log('¡Bot listo y autenticado!');
  startMessageSendingProcess();
});

client.on('authenticated', () => {
  console.log('Sesión autenticada correctamente.');
});

client.on('auth_failure', () => {
  console.error('Fallo en la autenticación. Por favor, reinicia el bot y escanea el QR nuevamente.');
});

client.on('disconnected', (reason) => {
  console.error('El cliente se desconectó. Razón:', reason);
});

// Función para enviar mensajes al grupo
async function sendMessageToGroup(groupName, message) {
  try {
    const chats = await client.getChats();
    const group = chats.find(chat => chat.name === groupName);

    if (group) {
      console.log(`Grupo encontrado: ${groupName}`);
      await group.sendMessage(message);
      console.log(`Mensaje enviado exitosamente a las ${moment().format('HH:mm:ss')}`);
    } else {
      console.error(`No se encontró el grupo: ${groupName}`);
    }
  } catch (err) {
    console.error('Error al enviar el mensaje:', err);
  }
}

// Función principal para el proceso de envío de mensajes
function startMessageSendingProcess() {
  const groupName = config.groupName;
  const message = config.message;
  const targetTime = moment.tz(config.scheduledTime, 'Europe/Madrid');

  const interval = setInterval(async () => {
    const now = moment.tz('Europe/Madrid');
    console.log(`Hora actual: ${now.format('HH:mm:ss')}. Esperando la hora: ${targetTime.format('HH:mm:ss')}`);

    if (now.isSameOrAfter(targetTime)) {
      console.log('¡Hora de enviar el mensaje! Verificando si el grupo está abierto...');
      try {
        const chats = await client.getChats();
        const group = chats.find(chat => chat.name === groupName);

        if (group && group.isGroup) {
          const canSendMessages = !group.isRestricted; // Verificar si el grupo permite mensajes
          if (canSendMessages) {
            console.log('El grupo está abierto para mensajes. Intentando enviar...');
            await sendMessageToGroup(groupName, message);
            clearInterval(interval); // Detener el proceso tras enviar el mensaje
          } else {
            console.log('El grupo aún está bloqueado para enviar mensajes.');
          }
        } else {
          console.error('No se encontró el grupo o no es un grupo válido.');
        }
      } catch (err) {
        console.error('Error al verificar el grupo:', err);
      }
    }
  }, 500); // Intentos cada 0.5 segundos
}

// Inicializar cliente
client.initialize();

// Crear un servidor HTTP para Render
const http = require('http');
const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running');
}).listen(port, () => {
  console.log(`Servidor HTTP activo en el puerto ${port}`);
});
