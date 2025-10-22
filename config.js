// Configuración de analítica
// Ajusta LOG_ENDPOINT cuando despliegues (por ejemplo, a tu API o servicio de logging)
// Si LOG_ENDPOINT es null, los eventos se registrarán en consola como fallback
window.APP_CONFIG = {
  LOG_ENDPOINT: null, // Ejemplo: 'https://tu-dominio.com/api/logs'
  APP_ID: 'gastos-app',
  SEND_INTERVAL_MS: 5000, // intervalo de envío en ms para eventos en cola
  // Configuración de Supabase (base de datos y autenticación)
  // Rellena estos valores con tu proyecto de Supabase
  SUPABASE_URL: '', // Ejemplo: 'https://xxxxx.supabase.co'
  SUPABASE_ANON_KEY: '', // Clave anónima del proyecto
};