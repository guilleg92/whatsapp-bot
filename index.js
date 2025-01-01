const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const redis = require('redis');
const { CronJob } = require('cron');
const moment = require('moment-timezone');
const fs = require('fs');

// Cargar la configuración desde el archivo config.json
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

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
    const group = chats.find((chat) => chat.name === config.groupName);

    if (group && group.isGroup) {
      console.log('Grupo encontrado. Intentando enviar el mensaje...');
      let attempts = 0;

      // Intenta enviar el mensaje cada 0,5 segundos
      const interval = setInterval(() => {
        attempts++;

        // Si el grupo está habilitado para enviar mensajes, envía el mensaje
        if (group.isOpen) {
          group.sendMessage(config.messageContent);
          console.log(`Mensaje enviado al grupo ${config.groupName} a las ${moment().format('HH:mm:ss')}`);
          clearInterval(interval);
        } else {
          console.log(`Intento ${attempts}: El grupo está bloqueado. Intentando nuevamente...`);
        }
      }, 500);
    } else {
      console.log(`Grupo ${config.groupName} no encontrado.`);
    }
  });
};

// Tarea programada para enviar el mensaje a la hora determinada
const job = new CronJob(`0 ${config.scheduledTime.split(':')[1]} ${config.scheduledTime.split(':')[0]} * * *`, () => {
  console.log(`Buscando el grupo a las ${config.scheduledTime}...`);
  sendMessage();
}, null, true, 'Europe/Madrid');

// Inicia el servidor Express (opcional, si lo necesitas)
const app = express();
app.listen(3000, () => {
  console.log('Servidor corriendo en el puerto 3000');
});

