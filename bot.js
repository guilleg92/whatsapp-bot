const { Client, LocalAuth } = require('whatsapp-web.js');
const schedule = require('node-schedule');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true
    }
});

client.on('qr', (qr) => {
    // Genera el código QR para escanear
    qrcode.generate(qr, { small: true });
    console.log('Escanea el QR para iniciar sesión');
});

client.on('ready', () => {
    console.log('Cliente listo. Buscando el grupo...');
    
    // Reemplaza "Prueba" con el nombre de tu grupo
    const groupName = 'Prueba';
    const message = 'Mensaje de prueba';
    
    // Función para enviar el mensaje
    const sendMessage = async () => {
        const chat = await client.getChats();
        const group = chat.find((c) => c.name === groupName);
        
        if (group) {
            group.sendMessage(message);
            console.log(`Mensaje enviado a ${groupName}: "${message}"`);
            return true;
        }
        return false;
    };

    // Programar el mensaje para una hora específica
    const scheduleTime = '12:55';  // Define la hora en formato HH:mm

    schedule.scheduleJob(scheduleTime, async () => {
        let success = false;
        
        // Intentar enviar el mensaje varias veces hasta que se logre
        while (!success) {
            success = await sendMessage();
            if (!success) {
                console.log('Intentando nuevamente...');
                await new Promise(resolve => setTimeout(resolve, 1000));  // Espera de 1 segundo
            }
        }
        console.log('Mensaje enviado con éxito!');
        client.destroy();  // Detener el bot después de enviar el mensaje
    });
});

client.on('auth_failure', () => {
    console.log('Autenticación fallida. Por favor, escanea el código QR nuevamente.');
});

client.on('disconnected', () => {
    console.log('Cliente desconectado.');
});

client.initialize();
