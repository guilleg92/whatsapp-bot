const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode-terminal');
const Redis = require('ioredis');

// Configuración de Redis
const redis = new Redis(process.env.REDIS_URL);

const groupName = process.env.GROUP_NAME || 'prueba';
const targetHour = process.env.TARGET_HOUR || '13:00:00';
const messageContent = process.env.MESSAGE_CONTENT || '¡Hola, este es un mensaje automático!';
const timeZone = 'Europe/Madrid';

let sessionData;

// Recuperar la sesión desde Redis
async function loadSession() {
    const session = await redis.get('whatsapp-session');
    if (session) {
        console.log('Sesión recuperada desde Redis.');
        return JSON.parse(session);
    }
    console.log('No se encontró sesión almacenada.');
    return null;
}

// Guardar la sesión en Redis
async function saveSession(session) {
    console.log('Guardando sesión en Redis...');
    await redis.set('whatsapp-session', JSON.stringify(session));
    console.log('Sesión guardada correctamente.');
}

// Inicializar cliente de WhatsApp
async function initializeClient() {
    const savedSession = await loadSession();

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './.wwebjs_auth',
            session: savedSession, // Cargar sesión si existe
        }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    });

    client.on('qr', (qr) => {
        console.log('Escanea este código QR para iniciar sesión:');
        QRCode.generate(qr, { small: true });
    });

    client.on('authenticated', (session) => {
        console.log('Sesión autenticada.');
        sessionData = session;
        saveSession(session);
    });

    client.on('ready', () => {
        console.log('Cliente listo. Bot iniciado correctamente.');
        startBot(client);
    });

    client.on('auth_failure', () => {
        console.error('Error de autenticación. Por favor, escanea el QR nuevamente.');
    });

    client.initialize();
}

function startBot(client) {
    console.log(`Buscando el grupo: ${groupName}`);
    client.getChats().then((chats) => {
        const groupChat = chats.find((chat) => chat.name.trim() === groupName.trim());
        if (!groupChat) {
            console.error(`Grupo "${groupName}" no encontrado. Verifica el nombre en la variable GROUP_NAME.`);
            console.log('Grupos disponibles:');
            chats.filter(chat => chat.isGroup).forEach(chat => console.log(`- ${chat.name}`));
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
initializeClient();
