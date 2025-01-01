const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// Configuración
const groupName = process.env.GROUP_NAME || 'Prueba';
const message = process.env.MESSAGE || 'Mensaje a enviar';
const targetTime = process.env.TARGET_TIME || '12:00'; // Hora en formato HH:mm
const timezone = 'Europe/Madrid';

// Variables para la sesión
let sessionData = process.env.WHATSAPP_SESSION ? JSON.parse(process.env.WHATSAPP_SESSION) : null;

// Inicializar cliente de WhatsApp
const client = new Client({
    session: sessionData,
});

// Generar QR si no hay sesión
client.on('qr', (qr) => {
    console.log('Escanea este código QR para iniciar sesión:');
    qrcode.generate(qr, { small: true });
});

// Evento de autenticación
client.on('authenticated', (session) => {
    console.log('Sesión autenticada. Actualiza la variable de entorno con esta sesión:');
    console.log(JSON.stringify(session));
});

// Evento de cliente listo
client.on('ready', async () => {
    console.log('Cliente listo y sesión iniciada.');

    // Buscar el grupo
    console.log(`Buscando el grupo: ${groupName}...`);
    const chats = await client.getChats();
    const group = chats.find(chat => chat.name === groupName);

    if (!group) {
        console.error(`No se encontró el grupo con el nombre "${groupName}".`);
        return;
    }

    console.log(`Grupo "${groupName}" encontrado. Preparando para enviar el mensaje.`);

    // Esperar hasta la hora objetivo
    const now = new Date().toLocaleTimeString('en-GB', { timeZone: timezone });
    while (now < targetTime) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
    }

    console.log(`Es la hora. Comenzando intentos para enviar el mensaje: "${message}"`);

    // Intentar enviar el mensaje
    let sent = false;
    while (!sent) {
        try {
            await group.sendMessage(message);
            console.log(`Mensaje enviado con éxito a las ${new Date().toLocaleTimeString('en-GB', { timeZone: timezone })}.`);
            sent = true;
        } catch (err) {
            console.log('Intentando enviar el mensaje...');
        }
    }
});

client.initialize();
