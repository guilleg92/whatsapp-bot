const { Client, LocalAuth } = require('whatsapp-web.js');
const moment = require('moment-timezone');

// Definir el grupo y el mensaje
const groupName = 'Prueba';
const message = 'Mensaje de Prueba';

// Hora en la que se debe enviar el mensaje (en formato HH:mm, hora de Madrid)
const targetTime = '12:50';

// Usar la zona horaria de Madrid
moment.tz.setDefault("Europe/Madrid");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Asegúrate de que Puppeteer se ejecute en modo headless
        args: [
            '--no-sandbox',  // Soluciona problemas de seguridad en entornos sin cabeza
            '--disable-setuid-sandbox', // Para entornos como servidores
            '--disable-dev-shm-usage', // Evita problemas de memoria
            '--disable-gpu', // Desactiva la aceleración de hardware
            '--window-size=1920x1080' // Define el tamaño de la ventana (necesario en algunos entornos)
        ]
    }
});

client.on('qr', (qr) => {
    console.log('QR recibido', qr);
    // El QR debe ser escaneado por ti para autenticar la sesión
});

client.on('ready', async () => {
    console.log('Cliente listo. Buscando el grupo...');
    
    // Obtener el grupo
    const chats = await client.getChats();
    const group = chats.find(chat => chat.name === groupName);
    
    if (group) {
        console.log(`Grupo encontrado: ${groupName}`);
        
        // Función que verifica la hora actual y envía el mensaje si es la hora correcta
        const checkTimeAndSend = async () => {
            const currentTime = moment.tz('Europe/Madrid').format('HH:mm');
            console.log(`Hora actual: ${currentTime}`);
            
            if (currentTime === targetTime) {
                console.log('Es la hora correcta para enviar el mensaje.');
                await group.sendMessage(message);
                console.log('Mensaje enviado.');
                clearInterval(intervalId); // Detener el intervalo después de enviar el mensaje
            }
        };
        
        // Configurar el intervalo para hacer intentos cada 100ms (0.1 segundos)
        const intervalId = setInterval(checkTimeAndSend, 100); // Realiza intentos cada 100ms
    } else {
        console.log(`No se encontró el grupo ${groupName}`);
    }
});

client.on('message', (message) => {
    console.log('Nuevo mensaje:', message.body);
});

client.initialize();
