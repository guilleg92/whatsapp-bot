const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const fs = require('fs');

// Cargar configuración
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Crear el cliente de WhatsApp con autenticación local
const client = new Client({
    authStrategy: new LocalAuth()  // Usamos LocalAuth para guardar la sesión
});

// Mostrar el código QR cuando no está autenticado
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el código QR para iniciar sesión.');
});

// Cuando el cliente esté listo, proceder con la lógica
client.on('ready', async () => {
    console.log('¡Autenticado correctamente!');

    // Buscar el grupo primero
    const chat = await findGroup(config.groupName);
    if (!chat) {
        console.log(`No se encontró el grupo ${config.groupName}`);
        return;
    }

    // Obtener la hora actual en Madrid
    const now = moment().tz('Europe/Madrid');
    console.log(`Hora actual en Madrid: ${now.format('HH:mm')}`);

    // Hora objetivo de la configuración
    const targetTime = moment(config.time, 'HH:mm').tz('Europe/Madrid');
    console.log(`Hora objetivo: ${targetTime.format('HH:mm')}`);

    // Verificar si aún no es la hora de enviar el mensaje
    if (now.isBefore(targetTime)) {
        console.log('Aún no es la hora de enviar el mensaje');
        return;
    }

    // Verificar si el grupo está bloqueado para escribir
    if (chat.isLocked) {
        console.log('El grupo está bloqueado para escribir.');
        await waitForUnlock(chat);
    }

    // Enviar el mensaje
    await sendMessage(chat);
    console.log('Mensaje enviado con éxito');
});

// Función para encontrar el grupo
async function findGroup(groupName) {
    const chats = await client.getChats();
    const chat = chats.find(c => c.name === groupName);
    return chat;
}

// Función para esperar que el grupo sea desbloqueado
async function waitForUnlock(chat) {
    console.log('Esperando a que el grupo sea desbloqueado...');
    let attempts = 0;

    while (chat.isLocked) {
        attempts++;
        console.log(`Intentando (intentos: ${attempts})...`);
        await sleep(500); // Esperar 0.5 segundos
        chat = await findGroup(config.groupName);
    }
    console.log('El grupo ha sido desbloqueado');
}

// Función para enviar el mensaje
async function sendMessage(chat) {
    await chat.sendMessage(config.message);
}

// Función de pausa
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Iniciar sesión
client.initialize();
