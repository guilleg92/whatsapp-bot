const { Client } = require('whatsapp-web.js');
const redis = require('redis');
const fs = require('fs');
const moment = require('moment-timezone');
const config = require('./config.json');

const client = new Client();

const redisClient = redis.createClient({ url: config.redis_url });
redisClient.connect();

async function initializeSession() {
    const sessionData = await redisClient.get('whatsapp-session');
    if (sessionData) {
        console.log("Sesión autenticada correctamente.");
        return JSON.parse(sessionData);
    } else {
        console.log("Iniciando sesión por primera vez...");
        return new Promise((resolve, reject) => {
            client.on('qr', (qr) => {
                console.log('Escanea este código QR:', qr);
                resolve(null);
            });
            client.on('authenticated', (session) => {
                redisClient.set('whatsapp-session', JSON.stringify(session));
                console.log("Sesión guardada correctamente.");
                resolve(session);
            });
            client.on('auth_failure', (error) => {
                reject(error);
            });
        });
    }
}

async function sendMessage() {
    const groupName = config.group_name;
    const targetTime = config.target_time;  // Ahora tenemos la hora en formato HH:mm
    const messageContent = config.message_content;

    const currentTime = moment().tz("Europe/Madrid").format('HH:mm');  // Hora actual en formato HH:mm
    console.log(`Hora actual: ${currentTime}. Hora objetivo: ${targetTime}.`);

    if (currentTime !== targetTime) {
        console.log(`Aún no es la hora de enviar el mensaje. Hora objetivo: ${targetTime}. Hora actual: ${currentTime}.`);
        return;
    }

    try {
        const group = await client.getChats().then(chats => chats.find(chat => chat.name === groupName));
        if (group) {
            console.log(`Grupo encontrado: ${group.name}. Intentando enviar el mensaje...`);
            let attempts = 0;

            const interval = setInterval(async () => {
                attempts++;
                const canSendMessage = group.isOpen;
                if (canSendMessage) {
                    await group.sendMessage(messageContent);
                    console.log(`Mensaje enviado con éxito a las ${moment().tz("Europe/Madrid").format('HH:mm:ss')}.`);
                    clearInterval(interval);
                } else {
                    console.log(`Intento ${attempts}: El grupo aún está cerrado para escribir.`);
                }
            }, 500);
        } else {
            console.log("No se encontró el grupo.");
        }
    } catch (error) {
        console.log("Error al enviar el mensaje:", error);
    }
}

client.on('ready', async () => {
    console.log("Bot listo.");
    await sendMessage();
});

initializeSession().then(session => {
    if (session) {
        client.initialize();
    }
});
