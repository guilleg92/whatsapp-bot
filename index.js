const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const fs = require('fs');

// Cargar la configuración desde config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Variables globales
let client;

// Función para iniciar sesión y manejar la autenticación
function startBot() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log('Escanea el código QR');
        qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
        console.log('Autenticado correctamente');
    });

    client.on('ready', () => {
        console.log('El bot está listo');
        monitorGroup();
    });

    client.on('message', (message) => {
        // Si el bot recibe un mensaje, no hacer nada
    });

    client.initialize();
}

// Función para verificar si el grupo está habilitado para escribir
async function isGroupOpen(groupName) {
    const chat = await client.getChats();
    const group = chat.find((g) => g.name === groupName);
    if (group) {
        return group.isGroup && group.isLocked === false; // Si el grupo está desbloqueado
    }
    return false;
}

// Función para enviar el mensaje
async function sendMessage(groupName, messageContent) {
    const chat = await client.getChats();
    const group = chat.find((g) => g.name === groupName);
    if (group && !group.isLocked) {
        group.sendMessage(messageContent);
        console.log(`Mensaje enviado: ${messageContent}`);
    }
}

// Función para verificar la hora y enviar el mensaje
function checkTimeAndSend() {
    const now = moment().tz('Europe/Madrid');
    const targetTime = moment(config.time, 'HH:mm').tz('Europe/Madrid');
    console.log(`Hora actual: ${now.format('HH:mm')}`);
    console.log(`Hora objetivo: ${targetTime.format('HH:mm')}`);

    if (now.isSameOrAfter(targetTime)) {
        // Si la hora objetivo ya pasó, intentar enviar el mensaje
        console.log('Es hora de intentar enviar el mensaje');
        trySendingMessage();
    } else {
        console.log('Aún no es la hora de enviar el mensaje');
    }
}

// Función para intentar enviar el mensaje cada 0.5 segundos hasta que se habilite el grupo
async function trySendingMessage() {
    const groupName = config.groupName;
    const messageContent = config.message;

    let attempts = 0;
    const interval = setInterval(async () => {
        attempts++;
        console.log(`Intento ${attempts}`);
        const groupOpen = await isGroupOpen(groupName);
        if (groupOpen) {
            await sendMessage(groupName, messageContent);
            clearInterval(interval); // Detener los intentos una vez enviado el mensaje
        }
    }, 500);
}

// Comenzar el bot
startBot();

// Verificar la hora cada minuto
setInterval(checkTimeAndSend, 60000);
