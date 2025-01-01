const { Client, RemoteAuth } = require('whatsapp-web.js');
const { createClient } = require('redis');
const moment = require('moment-timezone');
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
  authStrategy: new RemoteAuth({ client: redisClient }),
  puppeteer: { headless: true },
  restartOnAuthFail: true
});

// Variables de configuración
const { groupName, message, scheduledTime } = config;

// Función principal
client.on('qr', (qr) => {
  console.log('Escanea el código QR para iniciar sesión:', qr);
});

client.on('ready', () => {
  console.log('¡Bot listo y autenticado!');
  programarEnvio();
});

client.on('authenticated', () => {
  console.log('Sesión autenticada correctamente.');
});

client.on('auth_failure', () => {
  console.error('Fallo en la autenticación. Por favor, reinicia el bot.');
});

client.on('disconnected', (reason) => {
  console.error('Cliente desconectado:', reason);
  console.log('Reiniciando cliente...');
  client.initialize();
});

// Programar el envío del mensaje
function programarEnvio() {
  const now = moment.tz('Europe/Madrid');
  const targetTime = moment.tz(scheduledTime, 'HH:mm', 'Europe/Madrid');

  if (now.isAfter(targetTime)) {
    console.log('La hora programada ya pasó. Revisa la configuración.');
    return;
  }

  const delay = targetTime.diff(now, 'milliseconds');
  console.log(`Esperando hasta las ${targetTime.format('HH:mm')} para enviar el mensaje...`);

  setTimeout(() => verificarGrupoYEnviar(), delay);
}

// Verificar grupo y enviar mensaje
async function verificarGrupoYEnviar() {
  try {
    const chats = await client.getChats();
    const group = chats.find(chat => chat.name === groupName);

    if (!group) {
      console.error(`No se encontró el grupo: ${groupName}`);
      return;
    }

    console.log(`Grupo encontrado: ${groupName}`);
    console.log('Esperando que el grupo esté habilitado para escribir...');

    let enviado = false;
    let intentos = 0;

    const intervalo = setInterval(async () => {
      try {
        intentos++;
        console.log(`Intento #${intentos}: Verificando permisos para escribir...`);

        await group.sendMessage(message);
        console.log(`Mensaje enviado exitosamente a las ${moment().format('HH:mm:ss')}`);
        enviado = true;
        clearInterval(intervalo);
      } catch (error) {
        if (!error.message.includes('write')) {
          console.error('Error inesperado:', error);
          clearInterval(intervalo);
        }
      }
    }, 500);
  } catch (error) {
    console.error('Error al verificar el grupo o enviar el mensaje:', error);
  }
}

// Inicializar el cliente
client.initialize();

// Servidor HTTP necesario para Render
const http = require('http');
const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running');
}).listen(port, () => {
  console.log(`Bot está escuchando en el puerto ${port}`);
});
