const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const redis = require('redis');
const moment = require('moment-timezone');
const cron = require('node-cron');

// Configuración de Redis
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});

redisClient.connect().catch(err => console.log("Error connecting to Redis:", err));

// Configuración de WhatsApp Web
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

// Función para iniciar sesión
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el QR para iniciar sesión');
});

client.on('authenticated', () => {
    console.log('Autenticado correctamente');
});

client.on('ready', () => {
    console.log('El bot está listo');
    startMessageTask();
});

// Función para enviar el mensaje
async function sendMessage() {
    const groupName = process.env.GROUP_NAME;
    const message = process.env.MESSAGE_CONTENT;
    const group = await client.getChats().then(chats => {
        return chats.find(chat => chat.name === groupName);
    });

    if (group) {
        console.log('Grupo encontrado, enviando mensaje...');
        await group.sendMessage(message);
        console.log(`Mensaje enviado a las ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
    } else {
        console.log('Grupo no encontrado');
    }
}

// Función para comprobar si el grupo está abierto y enviar el mensaje
function startMessageTask() {
    const targetHour = 13; // Hora objetivo (13:00 Madrid)

    cron.schedule('*/0.5 * * * * *', async () => {
        const currentTime = moment().tz('Europe/Madrid').hour();
        const minute = moment().tz('Europe/Madrid').minute();

        if (currentTime === targetHour && minute === 0) {
            console.log('¡Hora de enviar el mensaje!');
            await sendMessage();
        } else {
            console.log(`Esperando la hora correcta: ${currentTime}:${minute}`);
        }
    });
}

// Conectar el cliente
client.initialize();
