const fs = require('fs');

// Variables de Railway (hardcodeadas temporalmente para debug)
const envContent = `
NODE_ENV=production
PORT=8080
HOST=localhost
APP_KEY=$2b$10$HgtuEG8qrKXeDTEe7Quf1O96kqtQvT3nnSVEYA5zwJ.QAE9Kju6Yq
APP_DB_PROVIDER=postgres
PG_DB_HOST=postgres.railway.internal
PG_DB_PORT=5432
PG_DB_USER=postgres
PG_DB_PASSWORD=IoYcIFYlUsjPURHMluuShckBGaNdrSmn
PG_DB_NAME=railway
JWT_SECRET=tu-secret-muy-seguro-cambia-esto
JWT_EXPIRES_IN=24h
`;

fs.writeFileSync('.env', envContent);
console.log('✅ Archivo .env creado con las variables de Railway'); 