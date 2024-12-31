const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Configuración
const groupName = 'Prueba'; // Nombre del grupo
const message = 'Mensaje de Prueba'; // Mensaje a enviar
const scheduledTime = '12:30'; // Hora en formato HH:MM (hora de Madrid)
const intervalMs = 10; // Intervalo en milisegundos para intentos

// Función para obtener la hora actual en Madrid
const getCurrentTimeInMadrid = () => {
    const now = new Date();
    const madridOffset = 1; // UTC+1
    const isDST = now.getUTCMonth() >= 2 && now.getUTCMonth() <= 9; // Marzo a Octubre
    const offset = madridOffset + (isDST ? 1 : 0); // Agregar 1 si es horario de verano
    const madridTime = new Date(now.getTime() + offset * 60 * 60 * 1000);
    return madridTime.toTimeString().split(' ')[0].slice(0, 5);
};

// Inicializar el cliente
const client = new Client();

client.on('qr', (qr) => {
    console.log('Escanea este código QR con WhatsApp para iniciar sesión:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Cliente listo. Buscando el grupo...');

    const checkTime = () => {
        const currentTime = getCurrentTimeInMadrid();
        return currentTime >= scheduledTime;
    };

    const sendMessage = async () => {
        try {
            const chats = await client.getChats();
            const group = chats.find(chat => chat.name === groupName);

            if (group) {
                console.log(`Grupo encontrado: ${groupName}`);
                await group.sendMessage(message);
                console.log('Mensaje enviado con éxito.');
                clearInterval(intervalId);
            } else {
                console.log('Grupo no encontrado. Intentando de nuevo...');
            }
        } catch (error) {
            console.error('Error al enviar el mensaje:', error);
        }
    };

    const intervalId = setInterval(() => {
        if (checkTime()) {
            sendMessage();
        }
    }, intervalMs);
});

client.on('auth_failure', (msg) => {
    console.error('Error de autenticación:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
});

client.initialize();
