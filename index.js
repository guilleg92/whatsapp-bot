// Importa la librería correcta
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const redis = require('redis');
const { CronJob } = require('cron');
const fs = require('fs');

// Crea un cliente de Redis (asegúrate de tener Redis configurado correctamente)
const client = redis.createClient({ url: 'redis://localhost:6379' });

// Crea una nueva instancia del cliente de WhatsApp con autenticación local
const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
});

// Genera el código QR para la autenticación
whatsappClient.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

// Conecta el cliente de WhatsApp
whatsappClient.on('ready', () => {
  console.log('Cliente de WhatsApp listo');
});

// Inicia el cliente de WhatsApp
whatsappClient.initialize();

// Definir la tarea cron
const job = new CronJob('0 0 * * *', () => {
  // Lógica para enviar mensajes al grupo
  console.log('Intentando enviar mensaje al grupo...');

  // Reemplaza 'group_name' con el nombre del grupo de WhatsApp al que deseas enviar el mensaje
  const groupName = 'prueba';
  const message = '¡Este es un mensaje automático!';

  whatsappClient.getChats().then((chats) => {
    const group = chats.find((chat) => chat.name === groupName);

    if (group) {
      // Si encontramos el grupo, enviamos el mensaje
      group.sendMessage(message);
      console.log(`Mensaje enviado al grupo ${groupName} a las 00:00`);
    } else {
      console.log(`Grupo ${groupName} no encontrado.`);
    }
  });
});

// Inicia la tarea cron
job.start();

// Servidor Express (si es necesario)
const app = express();
app.listen(3000, () => {
  console.log('Servidor corriendo en el puerto 3000');
});

