const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const redis = require('redis');
const moment = require('moment-timezone');
const cron = require('node-cron');

// Variables configurables
const groupName = 'Nombre del grupo'; // Cambia esto por el nombre de tu grupo
const message = '¡Este es un mensaje automatizado!'; // El mensaje a enviar
const targetTime = '13:00'; // Hora en la que se abrirá el grupo (hora de Madrid)
const timezone = 'Europe/Madrid'; // Zona horaria de Madrid

// Configuración de Redis
const redisClient = redis.createClient({
  host: 'localhost', // Cambia esto si usas un Redis remoto
  port: 6379,
});

redisClient.on('connect', () => {
  console.log('Conectado a Redis');
});

// Crear cliente de WhatsApp
const client = new Client({
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// Verifica si la sesión ya está guardada en Redis
const authenticate = () => {
  redisClient.get('session', (err, session) => {
    if (session) {
      console.log('Sesión autenticada automáticamente');
      client.initialize();
    } else {
      client.on('qr', (qr) => {
        console.log('Escanea este código QR:');
        qrcode.generate(qr, { small: true });
      });
      client.on('authenticated', (session) => {
        console.log('Sesión iniciada por primera vez');
        redisClient.set('session', JSON.stringify(session), (err) => {
          if (err) console.error('Error al guardar la sesión:', err);
        });
      });
      client.initialize();
    }
  });
};

// Función para enviar el mensaje cuando sea posible
const sendMessageWhenAvailable = () => {
  const interval = setInterval(async () => {
    try {
      const chat = await client.getChats();
      const group = chat.find((g) => g.name === groupName);
      if (group && group.isGroup) {
        if (group.isReadOnly === false) {
          await group.sendMessage(message);
          console.log(`Mensaje enviado a ${groupName} a las ${moment().format('HH:mm:ss')}`);
          clearInterval(interval); // Detenemos el intervalo una vez que se envía el mensaje
        } else {
          console.log('El grupo sigue restringido, esperando...');
        }
      }
    } catch (error) {
      console.error('Error al intentar enviar el mensaje:', error);
    }
  }, 500); // Intentos cada 0.5 segundos
};

// Configurar tarea cron para ejecutar a la hora determinada
cron.schedule(`0 13 * * *`, () => {
  console.log(`Ejecutando tarea programada a las ${moment().format('HH:mm:ss')}`);
  sendMessageWhenAvailable();
}, {
  scheduled: true,
  timezone: timezone,
});

// Iniciar autenticación y client
authenticate();

// Manejar desconexión
client.on('disconnected', () => {
  console.log('Cliente desconectado');
});
