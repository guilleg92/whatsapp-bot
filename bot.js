const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const schedule = require('node-schedule');
const fs = require('fs');

// Configuración
const groupName = 'Prueba'; // Cambiar según sea necesario
const message = '¡Hola! Este es un mensaje automático.'; // Cambiar según sea necesario
const madridTime = '11:40'; // Cambiar según sea necesario
const timeZone = 'Europe/Madrid';

console.log("Iniciando el bot de WhatsApp...");

// Inicializar el cliente con LocalAuth
const client = new Client({
    authStrategy: new LocalAuth(),
});

client.on('qr', (qr) => {
    console.log('Escanea este código QR para iniciar sesión:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('El cliente está listo. ✅ La sesión se ha iniciado correctamente.');

    // Programar el envío del mensaje
    schedule.scheduleJob({ hour: parseInt(madridTime.split(':')[0]), minute: parseInt(madridTime.split(':')[1]), tz: timeZone }, async () => {
        console.log(`Buscando el grupo "${groupName}" para enviar el mensaje...`);

        try {
            const chats = await client.getChats();
            const group = chats.find((chat) => chat.isGroup && chat.name === groupName);

            if (!group) {
                console.error(`No se encontró el grupo "${groupName}".`);
                return;
            }

            console.log(`Grupo "${groupName}" encontrado. Iniciando intentos de envío...`);

            let attempts = 0;
            const interval = setInterval(async () => {
                attempts++;
                console.log(`Intento #${attempts} de enviar el mensaje...`);

                try {
                    await group.sendMessage(message);
                    console.log(`Mensaje enviado correctamente a las ${new Date().toLocaleTimeString(timeZone)}.`);
                    clearInterval(interval); // Detener intentos
                } catch (err) {
                    if (!err.message.includes('not authorized')) {
                        console.error('Error al intentar enviar el mensaje:', err.message);
                    }
                }
            }, 50); // Intentos cada 50ms
        } catch (err) {
            console.error('Error al buscar el grupo:', err.message);
        }
    });
});

client.on('auth_failure', (msg) => {
    console.error('Error de autenticación:', msg);
});

client.on('disconnected', () => {
    console.log('Cliente desconectado. Por favor, reinicia el bot.');
});

client.initialize();
