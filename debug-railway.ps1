# Script de debug para Railway - verificar variables de entorno

Write-Host "🔍 Debug: Verificando variables de entorno en Railway..." -ForegroundColor Green

Write-Host "📋 Variables de entorno disponibles:" -ForegroundColor Cyan
railway variables list

Write-Host ""
Write-Host "🗄️  Servicios disponibles:" -ForegroundColor Cyan
railway service list

Write-Host ""
Write-Host "🔧 Variables específicas de base de datos:" -ForegroundColor Cyan

try {
    $appDbProvider = railway variables get APP_DB_PROVIDER 2>$null
    Write-Host "APP_DB_PROVIDER: $appDbProvider" -ForegroundColor Green
} catch {
    Write-Host "APP_DB_PROVIDER: NO CONFIGURADA" -ForegroundColor Red
}

try {
    $pgDbHost = railway variables get PG_DB_HOST 2>$null
    Write-Host "PG_DB_HOST: $pgDbHost" -ForegroundColor Green
} catch {
    Write-Host "PG_DB_HOST: NO CONFIGURADA" -ForegroundColor Red
}

try {
    $pgDbPort = railway variables get PG_DB_PORT 2>$null
    Write-Host "PG_DB_PORT: $pgDbPort" -ForegroundColor Green
} catch {
    Write-Host "PG_DB_PORT: NO CONFIGURADA" -ForegroundColor Red
}

try {
    $pgDbUser = railway variables get PG_DB_USER 2>$null
    Write-Host "PG_DB_USER: $pgDbUser" -ForegroundColor Green
} catch {
    Write-Host "PG_DB_USER: NO CONFIGURADA" -ForegroundColor Red
}

try {
    $pgDbName = railway variables get PG_DB_NAME 2>$null
    Write-Host "PG_DB_NAME: $pgDbName" -ForegroundColor Green
} catch {
    Write-Host "PG_DB_NAME: NO CONFIGURADA" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Logs recientes:" -ForegroundColor Cyan
railway logs --tail 20 