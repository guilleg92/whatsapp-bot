const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Cargar datos de la sesión desde la variable de entorno
let sessionData = process.env.WHATSAPP_SESSION && process.env.WHATSAPP_SESSION !== '{}' 
    ? JSON.parse(process.env.WHATSAPP_SESSION) 
    : null;

// Configurar cliente de WhatsApp
const client = new Client({
    authStrategy: sessionData ? null : new LocalAuth(),
    session: sessionData || undefined,
});

client.on('qr', (qr) => {
    console.log('Escanea este código QR para iniciar sesión:');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', (session) => {
    console.log('Sesión autenticada. Actualiza la variable de entorno con esta sesión:');
    console.log(JSON.stringify(session)); // Mostrar el JSON de la sesión en los logs
    sessionData = session; // Guardar sesión en memoria
});

client.on('auth_failure', (msg) => {
    console.error('Error de autenticación:', msg);
});

client.on('ready', () => {
    console.log('Cliente listo. Bot iniciado correctamente.');
    startBot(); // Iniciar el bot una vez que el cliente esté listo
});

// Configuración del bot
const groupName = process.env.GROUP_NAME || 'Nombre del Grupo'; // Nombre del grupo
const messageContent = process.env.MESSAGE_CONTENT || 'Mensaje predeterminado'; // Contenido del mensaje
const targetHour = process.env.TARGET_HOUR || '13:00'; // Hora objetivo en formato HH:mm
const timeZone = 'Europe/Madrid'; // Zona horaria

// Función principal del bot
function startBot() {
    console.log(`Buscando el grupo: ${groupName}`);
    client.getChats().then((chats) => {
        const groupChat = chats.find((chat) => chat.name === groupName);
        if (!groupChat) {
            console.error(`Grupo "${groupName}" no encontrado. Verifica el nombre.`);
            return;
        }
        console.log(`Grupo "${groupName}" encontrado. Esperando la hora ${targetHour} para enviar el mensaje.`);

        const interval = setInterval(() => {
            const now = new Date().toLocaleTimeString('en-GB', { timeZone });
            if (now.startsWith(targetHour)) {
                console.log(`Intentando enviar mensaje al grupo "${groupName}"...`);
                groupChat.sendMessage(messageContent).then(() => {
                    console.log(`Mensaje enviado al grupo "${groupName}" a las ${now}`);
                    clearInterval(interval); // Detener los intentos
                }).catch((err) => {
                    console.error('Error al enviar el mensaje:', err);
                });
            } else {
                console.log(`Hora actual: ${now}. Aún no es la hora objetivo.`);
            }
        }, 500); // Intentar cada 500ms
    }).catch((err) => {
        console.error('Error al obtener los chats:', err);
    });
}

// Iniciar cliente
client.initialize();
