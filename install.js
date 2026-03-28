import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (msg) => console.log(`[INSTALADOR] ${msg}`);
const error = (msg) => console.error(`[ERROR] ${msg}`);

async function setup() {
  log('Iniciando instalación de AdminFincas MVP...');

  // 1. Verificar Node.js
  try {
    const nodeVersion = execSync('node -v').toString().trim();
    log(`Node.js detectado: ${nodeVersion}`);
  } catch (e) {
    error('Node.js no está instalado. Por favor instálalo desde https://nodejs.org/');
    process.exit(1);
  }

  // 2. Instalar dependencias
  log('Instalando dependencias (esto puede tardar un poco)...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('Dependencias instaladas correctamente.');
  } catch (e) {
    error('Error al instalar dependencias.');
    process.exit(1);
  }

  // 3. Configurar .env
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envPath)) {
    log('Creando archivo .env desde el ejemplo...');
    if (fs.existsSync(envExamplePath)) {
      let envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Intentar pedir la API Key o dejar el placeholder
      log('--- CONFIGURACIÓN NECESARIA ---');
      log('Recuerda configurar tu GROQ_API_KEY en el archivo .env para que la IA funcione.');
      
      fs.writeFileSync(envPath, envContent);
    } else {
      log('No se encontró .env.example, creando .env básico...');
      fs.writeFileSync(envPath, 'GROQ_API_KEY=tu_api_key_aqui\nRESEND_API_KEY=tu_api_key_aqui\nPORT=3000\n');
    }
  } else {
    log('El archivo .env ya existe.');
  }

  // 4. Inicializar DB (opcional si server.ts ya lo hace)
  log('Todo listo.');
  log('-------------------------------------------');
  log('Para iniciar la aplicación, ejecuta:');
  log('npm run dev');
  log('-------------------------------------------');
}

setup();
