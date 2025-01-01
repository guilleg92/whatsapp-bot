const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const redis = require('redis');
const { CronJob } = require('cron');
const moment = require('moment-timezone');

// Configuración de Redis para guardar la sesión
const redisClient = redis.createClient({ url: 'redis://localhost:6379' });

// Configuración del cliente de WhatsApp
const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// Configuración del grupo y mensaje (estos parámetros pueden ser editados cada día)
let groupName = 'Nombre del grupo'; // Cambia este valor según sea necesario
let messageContent = 'Mensaje automático del bot';
let scheduledTime = '13:00'; // Hora de envío en formato HH:mm (hora Madrid)

// Inicia el cliente de WhatsApp
whatsappClient.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
  console.log('Cliente de WhatsApp listo');
});

whatsappClient.on('auth_failure', () => {
  console.log('Error de autenticación. Por favor, vuelva a escanear el QR.');
});

// Inicia la autenticación
whatsappClient.initialize();

// Función para enviar el mensaje cuando sea posible
const sendMessage = () => {
  whatsappClient.getChats().then((chats) => {
    const group = chats.find((chat) => chat.name === groupName);

    if (group && group.isGroup) {
      console.log('Grupo encontrado. Intentando enviar el mensaje...');
      let attempts = 0;

      // Intenta enviar el mensaje cada 0,5 segundos
      const interval = setInterval(() => {
        attempts++;

        // Si el grupo está habilitado para enviar mensajes, envía el mensaje
        if (group.isOpen) {
          group.sendMessage(messageContent);
          console.log(`Mensaje enviado al grupo ${groupName} a las ${moment().format('HH:mm:ss')}`);
          clearInterval(interval);
        } else {
          console.log(`Intento ${attempts}: El grupo está bloqueado. Intentando nuevamente...`);
        }
      }, 500);
    } else {
      console.log(`Grupo ${groupName} no encontrado.`);
    }
  });
};

// Tarea programada para enviar el mensaje a la hora determinada
const job = new CronJob(`0 13 * * *`, () => {
  console.log(`Buscando el grupo a las ${scheduledTime}...`);
  sendMessage();
}, null, true, 'Europe/Madrid');

// Inicia el servidor Express (opcional, si lo necesitas)
const app = express();
app.listen(3000, () => {
  console.log('Servidor corriendo en el puerto 3000');
});
