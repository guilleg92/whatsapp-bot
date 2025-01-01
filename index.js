const { Client } = require('whatsapp-web.js');
const redis = require('redis');

// Configurar cliente de Redis
const clientRedis = redis.createClient({
  url: 'redis://red-ctqi1hbtq21c73a1s6ug:6379'
});

clientRedis.connect();

clientRedis.on('connect', () => {
  console.log('Conectado a Redis');
});

clientRedis.on('error', (err) => {
  console.error('Error en Redis:', err);
});

// Crear cliente de WhatsApp
const client = new Client({
  puppeteer: { headless: true },
  session: null // Empezamos sin sesión guardada
});

// Cargar la sesión desde Redis si está disponible
clientRedis.get('whatsapp_session', (err, session) => {
  if (err) {
    console.error('Error al obtener sesión de Redis:', err);
  } else if (session) {
    client.session = JSON.parse(session);
    console.log('Sesión cargada desde Redis');
    client.initialize(); // Iniciar sesión si la sesión está guardada
  } else {
    client.initialize(); // Si no hay sesión guardada, se inicia normalmente
  }
});

// Evento cuando el bot genera un código QR (para la primera vez)
client.on('qr', (qr) => {
  console.log('Escanea el código QR con tu WhatsApp:');
  console.log(qr);
});

// Evento cuando la sesión se ha autenticado correctamente
client.on('authenticated', (session) => {
  console.log('Sesión autenticada');
  // Guardar la sesión en Redis
  clientRedis.set('whatsapp_session', JSON.stringify(session), (err, reply) => {
    if (err) {
      console.error('Error al guardar la sesión en Redis:', err);
    } else {
      console.log('Sesión guardada en Redis');
    }
  });
});

// Evento cuando la autenticación falla
client.on('auth_failure', (msg) => {
  console.error('Error de autenticación:', msg);
});

// Evento cuando el bot está listo
client.on('ready', () => {
  console.log('Bot está listo para enviar mensajes');
  // Aquí puedes agregar tu lógica para enviar el mensaje
  // Por ejemplo, enviar el mensaje a la hora determinada
});

// Iniciar el cliente
client.initialize();

