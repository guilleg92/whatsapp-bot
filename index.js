const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Ruta del archivo donde se guardará la sesión
const sessionFilePath = path.join(__dirname, 'session.json');

// Verificar si ya existe una sesión guardada
let sessionData = null;
if (fs.existsSync(sessionFilePath)) {
    sessionData = require(sessionFilePath);
}

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-bot", dataPath: './session' }),
    session: sessionData,  // Usar la sesión si existe
});

client.on('qr', (qr) => {
    // Mostrar QR en la consola para que el usuario lo escanee
    qrcode.generate(qr, { small: true });
    console.log('Escanea el código QR');
});

client.on('authenticated', (session) => {
    // Guardar la sesión en el archivo JSON para usarla en futuras ejecuciones
    fs.writeFileSync(sessionFilePath, JSON.stringify(session));
    console.log('Sesión autenticada y guardada.');
});

client.on('ready', () => {
    console.log('El bot está listo y autenticado.');
    startBot();
});

client.on('message', message => {
    console.log('Mensaje recibido: ', message.body);
});

client.initialize();

async function startBot() {
    const config = require('./config.json');
    const groupName = config.groupName;
    const messageToSend = config.message;
    const sendTime = moment(config.sendTime, 'HH:mm').local();

    console.log(`Buscando grupo: ${groupName}`);
    
    const group = await findGroup(groupName);
    if (group) {
        console.log(`Grupo encontrado: ${groupName}`);
        await waitUntilSendTime(sendTime);
        await sendMessageWhenPossible(group, messageToSend);
    } else {
        console.log(`No se encontró el grupo: ${groupName}`);
    }
}

async function findGroup(groupName) {
    const groups = await client.getChats();
    return groups.find(group => group.name === groupName);
}

async function waitUntilSendTime(sendTime) {
    const now = moment().local();
    const delay = sendTime.diff(now, 'milliseconds');
    
    if (delay > 0) {
        console.log(`Esperando hasta la hora de envío: ${sendTime.format('HH:mm')}`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

async function sendMessageWhenPossible(group, message) {
    let attempts = 0;
    while (true) {
        const chat = await client.getChatById(group.id);
        if (!chat.isReadOnly) {
            console.log('El grupo está abierto para escribir. Enviando mensaje...');
            await group.sendMessage(message);
            console.log(`Mensaje enviado a las ${moment().format('HH:mm')}`);
            break;
        } else {
            attempts++;
            console.log(`El grupo está bloqueado. Intentando nuevamente... (Intento #${attempts})`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar 0.5 segundos antes de intentar nuevamente
        }
    }
}
