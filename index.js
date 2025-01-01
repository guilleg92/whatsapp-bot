const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const redis = require('redis');
const client = new Client();
const GROUP_NAME = 'prueba'; // Nombre del grupo
const MESSAGE = '¡Hola, este es un mensaje automático!'; // Mensaje a enviar
const REDIS_URL = 'redis://default:password@your-redis-url:6379'; // URL de Redis, ajústalo a tu configuración

// Conexión a Redis
const redisClient = redis.createClient({ url: REDIS_URL });

redisClient.connect();

// Función para guardar y obtener la sesión desde Redis
async function saveSession(session) {
  await redisClient.set('whatsapp-session', JSON.stringify(session));
}

async function getSession() {
  const session = await redisClient.get('whatsapp-session');
  return session ? JSON.parse(session) : null;
}

// Configuración del cliente de WhatsApp
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Escanea el código QR');
});

client.on('authenticated', (session) => {
  console.log('Sesión autenticada');
  saveSession(session); // Guardar sesión en Redis
});

client.on('ready', () => {
  console.log('Cliente listo. Bot iniciado correctamente');
  startBot();
});

// Función principal para enviar el mensaje
async function checkAndSendMessage() {
  try {
    const group = await client.getChatByName(GROUP_NAME);

    if (group) {
      // Verificar si el grupo permite enviar mensajes
      if (group.canSendMessages) {
        try {
          await group.sendMessage(MESSAGE);
          console.log(`Mensaje enviado al grupo "${GROUP_NAME}" a las ${new Date().toLocaleTimeString()}`);
        } catch (error) {
          console.log('Error al enviar el mensaje:', error);
        }
      } else {
        console.log(`El grupo "${GROUP_NAME}" está bloqueado para escribir. Realizando nuevos intentos...`);
        setTimeout(checkAndSendMessage, 500); // Intentar de nuevo en 0,5 segundos
      }
    } else {
      console.log(`Grupo "${GROUP_NAME}" no encontrado. Reintentando...`);
      setTimeout(checkAndSendMessage, 500); // Intentar de nuevo en 0,5 segundos
    }
  } catch (error) {
    console.log('Error al obtener el grupo:', error);
    setTimeout(checkAndSendMessage, 500); // Intentar de nuevo en 0,5 segundos
  }
}

// Iniciar la verificación cuando se alcanza la hora objetivo
function startBot() {
  const targetTime = '13:00:00'; // Hora objetivo para enviar el mensaje (hora en formato HH:MM:SS)
  
  const checkTime = setInterval(() => {
    const currentTime = new Date().toLocaleTimeString('es-ES', { hour12: false });

    console.log(`Hora actual: ${currentTime}. Aún no es la hora objetivo.`);

    if (currentTime === targetTime) {
      console.log('¡Es la hora objetivo! Intentando enviar mensaje...');
      checkAndSendMessage();
      clearInterval(checkTime); // Detener la verificación de la hora una vez que se alcanza la hora objetivo
    }
  }, 1000); // Verificar cada segundo si se ha alcanzado la hora objetivo
}

// Inicializar la sesión
client.initialize();
