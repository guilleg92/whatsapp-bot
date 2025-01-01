const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const redis = require('redis');
const fs = require('fs');
const moment = require('moment-timezone');
const { CronJob } = require('cron');

// Configuración de Redis
const redisClient = redis.createClient({
  url: process.env.REDIS_URL // URL de Redis proporcionada por Render
});

redisClient.connect();

// Cargar configuración desde config.json
const config = JSON.parse(fs.readFileSync('./src/config.json', 'utf8'));

// Configuración del cliente de WhatsApp
const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

whatsappClient.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Escanea el código QR');
});

whatsappClient.on('ready', () => {
  console.log('Cliente de WhatsApp listo');
});

whatsappClient.on('auth_failure', () => {
  console.log('Error de autenticación. Vuelve a escanear el QR');
});

whatsappClient.initialize();

const sendMessage = () => {
  whatsappClient.getChats().then((chats) => {
    const group = chats.find((chat) => chat.name === config.groupName);

    if (group && group.isGroup) {
      console.log('Grupo encontrado. Intentando enviar el mensaje...');
      let attempts = 0;

      // Intentar enviar el mensaje cada 0,5 segundos
      const interval = setInterval(() => {
        attempts++;

        // Si el grupo está habilitado para escribir, envía el mensaje
        if (group.isOpen) {
          group.sendMessage(config.messageContent);
          console.log(`Mensaje enviado al grupo ${config.groupName} a las ${moment().format('HH:mm:ss')}`);
          clearInterval(interval); // Detener los intentos después de enviar el mensaje
        } else {
          console.log(`Intento ${attempts}: El grupo está bloqueado. Intentando nuevamente...`);
        }
      }, 500); // Intentos cada 0,5 segundos
    } else {
      console.log(`Grupo ${config.groupName} no encontrado.`);
    }
  });
};

// Programar la tarea para enviar el mensaje a la hora indicada
const job = new CronJob(`0 ${config.scheduledTime.split(':')[1]} ${config.scheduledTime.split(':')[0]} * * *`, () => {
  console.log(`Buscando el grupo a las ${config.scheduledTime}...`);
  sendMessage();
}, null, true, 'Europe/Madrid');
