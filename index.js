const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone'); // Importar moment-timezone
const config = require('./config.json'); // Cargar configuración del grupo, mensaje y hora

let client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true } // Ejecutar sin abrir una ventana de navegador
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

    // Obtener configuración del archivo config.json
    const groupName = config.groupName;
    const message = config.message;
    const sendTimeString = config.sendTime; // Hora en formato hh:mm
    const sendTime = moment.tz(sendTimeString, "HH:mm", "Europe/Madrid").toDate(); // Convertir a hora de Madrid

    const currentTime = new Date();

    // Verificar si es el momento de enviar el mensaje
    if (sendTime > currentTime) {
        console.log(`Esperando hasta las ${sendTime.toLocaleString()} para enviar el mensaje...`);
    } else {
        console.log('La hora ya ha pasado. Enviando el mensaje ahora...');
        sendMessage();
    }

    // Función para enviar el mensaje al grupo
    function sendMessage() {
        let group;

        // Buscar el grupo de WhatsApp
        client.getChats().then(chats => {
            group = chats.find(chat => chat.name === groupName);
            if (group) {
                console.log(`Grupo encontrado: ${groupName}`);
                checkGroupAndSend(group);
            } else {
                console.log(`No se ha encontrado el grupo: ${groupName}`);
            }
        });

        // Función para verificar si el grupo permite escribir y enviar el mensaje
        function checkGroupAndSend(group) {
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                console.log(`Intento ${attempts}: Verificando si el grupo permite escribir...`);

                if (group.isReadOnly) {
                    console.log('El grupo está bloqueado para escribir, esperando...');
                } else {
                    console.log('El grupo está abierto para escribir. Enviando mensaje...');
                    group.sendMessage(message);
                    console.log(`Mensaje enviado a ${groupName} a las ${new Date().toLocaleString()}`);
                    clearInterval(interval); // Detener los intentos una vez que el mensaje se haya enviado
                }
            }, 500); // Verificar cada 0.5 segundos
        }
    }
});

client.init
