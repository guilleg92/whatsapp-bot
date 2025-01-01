const { Client } = require('whatsapp-web.js');
const redis = require('redis');
const moment = require('moment-timezone');
const fs = require('fs');

// Cargar configuraciones
const config = JSON.parse(fs.readFileSync('config.json'));

// Configuración de Redis
const redisClient = redis.createClient({
  url: 'redis://red-ctqi1hbtq21c73a1s6ug:6379',
});

redisClient.connect();

// Cliente de WhatsApp
const client = new Client({
  puppeteer: { headless: true },
  session: null, // La sesión se cargará desde Redis
  qrTimeout: 0,  // Deshabilitar el tiempo de espera del QR
  restartOnCrash: false, // No reiniciar el bot si se cae
});

// Guardar la sesión en Redis
client.on('authenticated', (session) => {
  console.log('Sesión autenticada correctamente');
  redisClient.set('whatsapp_session', JSON.stringify(session));
});

// Mostrar QR solo si no hay sesión guardada
redisClient.get('whatsapp_session', (err, session) => {
  if (err) {
    console.error('Error al obtener la sesión desde Redis:', err);
  } else if (session) {
    client.session = JSON.parse(session);
    console.log('Sesión cargada desde Redis');
    client.initialize();
  } else {
    client.initialize();
  }
});

// Evento QR para la primera autenticación
client.on('qr', (qr) => {
  console.log('Escanea el código QR con tu WhatsApp:');
  console.log(qr);
});

// Detectar cuando el bot está listo
client.on('ready', () => {
  console.log('Bot está listo para enviar mensajes');

  // Intentar enviar el mensaje a la hora programada
  setInterval(async () => {
    const now = moment.tz('Europe/Madrid');
    const targetTime = moment.tz(config.hourToSend, 'HH:mm', 'Europe/Madrid');

    if (now.isSameOrAfter(targetTime)) {
      await sendMessage();
    }
  }, 500); // Reintentar cada 0.5 segundos

});

// Buscar el grupo y enviar el mensaje
async function sendMessage() {
  console.log('Buscando el grupo...');
  const group = await findGroup(config.groupName);

  if (group) {
    console.log(`Grupo encontrado: ${config.groupName}`);
    const chat = await group.getChat();

    // Si el grupo está desbloqueado, enviar el mensaje
    if (chat.canSendMessages) {
      console.log('Grupo habilitado para enviar mensajes. Enviando mensaje...');
      await chat.sendMessage(config.message);
      console.log(`Mensaje enviado: "${config.message}"`);
      process.exit(); // Detener el bot después de enviar el mensaje
    } else {
      console.log('El grupo sigue bloqueado. Intentando nuevamente...');
    }
  } else {
    console.log('Grupo no encontrado. Intentando nuevamente...');
  }
}

// Buscar grupo por nombre
async function findGroup(groupName) {
  const groups = await client.getChats();
  return groups.find((group) => group.name === groupName);
}


