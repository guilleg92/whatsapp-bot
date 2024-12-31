const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const schedule = require('node-schedule');  // Para programar el envío de mensajes

// Configura el cliente de WhatsApp con LocalAuth para la autenticación persistente
const client = new Client({
    authStrategy: new LocalAuth(),  // Usar LocalAuth para guardar la sesión
    puppeteer: {
        headless: true,  // No se abre el navegador
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920x1080'
        ]
    }
});

// Evento para recibir el código QR cuando el bot no está autenticado
client.on('qr', (qr) => {
    console.log('QR recibido:', qr);
    // Puedes usar este QR para escanearlo la primera vez desde los logs de Render
});

// Evento cuando el cliente está listo (conectado y autenticado)
client.on('ready', () => {
    console.log('Cliente listo!');
    
    // Define la hora de envío (por ejemplo, 12:30) usando cron para node-schedule
    const sendTime = '30 12 * * *';  // Todos los días a las 12:30 (hora del servidor)
    
    // Programar el envío del mensaje
    schedule.scheduleJob(sendTime, function() {
        // Aquí pones el número de grupo o número de contacto al que deseas enviar el mensaje
        const groupName = 'Prueba';  // Nombre del grupo al que enviar el mensaje
        const message = '¡Mensaje de prueba!';  // Mensaje que quieres enviar

        // Buscar el grupo por nombre y enviar el mensaje
        client.getChats().then(chats => {
            const group = chats.find(chat => chat.name === groupName);
            if (group
