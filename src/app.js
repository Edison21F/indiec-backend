// ================================
// APP.JS ACTUALIZADO CON SINCRONIZACIÓN AUTOMÁTICA
// ================================

const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const path = require("path")
require("dotenv").config()
const config = require("../key")

// Importar configuraciones
const { connectMySQL, checkTablesExist } = require("./config/database.sql")
const { connectMongoDB } = require("./config/database.orm")
const logger = require("./config/logger")

// Importar middleware
const loggerMiddleware = require("./middleware/logger")
const errorHandler = require("./middleware/errorHandler")

// Importar rutas originales
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const musicRoutes = require("./routes/music")
const albumRoutes = require("./routes/albums")
const groupRoutes = require("./routes/groups")
const eventRoutes = require("./routes/events")

// Importar rutas híbridas
const rutasHibridas = require("./routes/index")

const app = express()

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    message: "Demasiadas peticiones, intenta de nuevo más tarde",
  },
})

// Middleware globales
app.use(helmet())
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
)
app.use(limiter)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(loggerMiddleware)

// Servir archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// ================================
// RUTAS ORIGINALES (Mantener compatibilidad)
// ================================
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/music", musicRoutes)
app.use("/api/albums", albumRoutes)
app.use("/api/groups", groupRoutes)
app.use("/api/events", eventRoutes)

// ================================
// RUTAS HÍBRIDAS (Nuevo sistema)
// ================================
app.use("/api/v2", rutasHibridas)

// ================================
// RUTAS DE INFORMACIÓN Y PRUEBAS
// ================================

// Ruta de prueba general
app.get("/api/health", async (req, res) => {
  try {
    const tableCount = await checkTablesExist()
    
    res.json({
      success: true,
      message: "INDIEC API funcionando correctamente",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: {
        mysql: {
          connected: true,
          tables: tableCount
        },
        mongodb: {
          connected: true
        }
      },
      sistemas: {
        original: "Activo",
        hibrido: "Activo"
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error en la API",
      error: error.message
    })
  }
})

// Ruta de información de la API
app.get("/api/info", (req, res) => {
  res.json({
    success: true,
    data: {
      nombre: "INDIEC API",
      version: "1.0.0",
      descripcion: "API híbrida para gestión musical con MySQL y MongoDB",
      documentacion: "/api/docs",
      sistemas: {
        original: {
          descripcion: "Sistema original con Sequelize y Mongoose",
          rutas_base: "/api/",
          tecnologias: ["Sequelize", "Mongoose", "MySQL", "MongoDB"]
        },
        hibrido: {
          descripcion: "Sistema híbrido optimizado",
          rutas_base: "/api/v2/",
          tecnologias: ["MySQL2", "MongoDB Native", "Transacciones híbridas"]
        }
      },
      endpoints: {
        auth: "/api/auth",
        usuarios_original: "/api/users",
        usuarios_hibrido: "/api/v2/usuarios-hibridos",
        artistas_hibrido: "/api/v2/artistas-hibridos",
        ventas_hibrido: "/api/v2/ventas-hibridas",
        eventos_hibrido: "/api/v2/eventos-hibridos",
        analytics_hibrido: "/api/v2/analytics-hibridos",
        catalogos: "/api/v2/catalogos"
      }
    }
  })
})

// Middleware para rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
    rutas_disponibles: {
      info: "GET /api/info",
      docs: "GET /api/docs",
      health: "GET /api/health",
      health_hibrido: "GET /api/v2/health-hibrido",
      sistema_original: "/api/*",
      sistema_hibrido: "/api/v2/*"
    }
  })
})

// Middleware de manejo de errores
app.use(errorHandler)

const PORT = config.PORT || 3000

// ================================
// INICIALIZACIÓN DEL SERVIDOR
// ================================

async function startServer() {
  try {
    logger.info("🚀 Iniciando servidor INDIEC...")
    printStartupBanner()

    // 1. Crear directorio de uploads si no existe
    await createUploadsDirectory()

    // 2. Conectar a las bases de datos (con sincronización automática)
    logger.info("📡 Conectando a bases de datos...")
    await connectMySQL() // Esto ya incluye la sincronización
    await connectMongoDB()

    // 3. Crear datos iniciales si no existen
    await crearDatosIniciales()

    // 4. Verificar que todo esté funcionando
    await verificarSistema()

    // 5. Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🎵 INDIEC API iniciado en puerto ${PORT}`)
      logger.info(`🌐 Sistema original: http://localhost:${PORT}/api`)
      logger.info(`🚀 Sistema híbrido: http://localhost:${PORT}/api/v2`)
      logger.info(`📚 Documentación: http://localhost:${PORT}/api/docs`)
      
      printSuccessBanner()
    })
  } catch (error) {
    logger.error("❌ Error al iniciar el servidor:", error)
    console.error("❌ Error crítico:", error)
    process.exit(1)
  }
}

// ================================
// FUNCIONES AUXILIARES
// ================================

function printStartupBanner() {
  console.log(`\n🎵 ================================`)
  console.log(`🎵 INDIEC API - Sistema Híbrido`)
  console.log(`🎵 Iniciando servicios...`)
  console.log(`🎵 ================================\n`)
}

function printSuccessBanner() {
  console.log(`\n🎵 ================================`)
  console.log(`🎵 INDIEC API - Sistema Híbrido`)
  console.log(`🎵 ================================`)
  console.log(`🌐 URL: http://localhost:${PORT}`)
  console.log(`📊 Estado: Funcionando`)
  console.log(`💾 MySQL: Conectado y Sincronizado`)
  console.log(`🍃 MongoDB: Conectado`)
  console.log(`🔧 Modo: ${config.NODE_ENV}`)
  console.log(`🎵 ================================\n`)
}

async function createUploadsDirectory() {
  try {
    const fs = require("fs")
    const uploadDir = path.join(__dirname, "../uploads")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
      logger.info("📁 Directorio uploads creado")
    } else {
      logger.info("📁 Directorio uploads verificado")
    }
  } catch (error) {
    logger.error("Error al crear directorio uploads:", error)
    throw error
  }
}

async function verificarSistema() {
  try {
    logger.info("🔍 Verificando integridad del sistema...")
    
    // Verificar que las tablas se crearon
    const tableCount = await checkTablesExist()
    logger.info(`📊 Base de datos contiene ${tableCount} tablas`)
    
    if (tableCount === 0) {
      logger.warn("⚠️  No se encontraron tablas en la base de datos")
    }
    
    logger.info("✅ Sistema verificado correctamente")
  } catch (error) {
    logger.error("Error en verificación del sistema:", error)
    throw error
  }
}

// ================================
// FUNCIÓN PARA CREAR DATOS INICIALES
// ================================

async function crearDatosIniciales() {
  try {
    const { Estado, Rol, Sexo, GeneroMusical, Pais } = require("./models/sql/associations")

    // Verificar si ya existen datos
    const estadosCount = await Estado.count()
    if (estadosCount > 0) {
      logger.info("💾 Datos iniciales ya existen")
      return
    }

    logger.info("📝 Creando datos iniciales...")

    // Crear estados
    await Estado.bulkCreate([
      { nombre: 'Activo', descripcion: 'Registro activo y disponible' },
      { nombre: 'Inactivo', descripcion: 'Registro inactivo temporalmente' },
      { nombre: 'Eliminado', descripcion: 'Registro marcado para eliminación' },
      { nombre: 'Pendiente', descripcion: 'Registro pendiente de aprobación' },
      { nombre: 'Suspendido', descripcion: 'Registro suspendido por políticas' }
    ])

    // Crear sexos
    await Sexo.bulkCreate([
      { nombre: 'Masculino', descripcion: 'Género masculino' },
      { nombre: 'Femenino', descripcion: 'Género femenino' },
      { nombre: 'No binario', descripcion: 'Género no binario' },
      { nombre: 'Prefiero no decir', descripcion: 'Prefiere no especificar' }
    ])

    // Crear roles
    await Rol.bulkCreate([
      { nombre: 'Administrador', descripcion: 'Acceso completo al sistema', permisos: { all: true } },
      { nombre: 'Manager', descripcion: 'Gestión de artistas y eventos', permisos: { artists: true, events: true } },
      { nombre: 'Artista', descripcion: 'Perfil de artista', permisos: { profile: true, music: true } },
      { nombre: 'Cliente', descripcion: 'Usuario final consumidor', permisos: { purchase: true, profile: true } },
      { nombre: 'Disquera', descripcion: 'Representante de disquera', permisos: { contracts: true, artists: true } }
    ])

    // Crear géneros musicales
    await GeneroMusical.bulkCreate([
      { nombre: 'Rock', descripcion: 'Música rock en todas sus variantes', estado_id: 1 },
      { nombre: 'Pop', descripcion: 'Música popular contemporánea', estado_id: 1 },
      { nombre: 'Jazz', descripcion: 'Jazz tradicional y contemporáneo', estado_id: 1 },
      { nombre: 'Clásica', descripcion: 'Música clásica y orquestal', estado_id: 1 },
      { nombre: 'Electrónica', descripcion: 'Música electrónica y EDM', estado_id: 1 },
      { nombre: 'Hip-Hop', descripcion: 'Hip-Hop y Rap', estado_id: 1 },
      { nombre: 'Reggae', descripcion: 'Reggae y música caribeña', estado_id: 1 },
      { nombre: 'Metal', descripcion: 'Heavy Metal y subgéneros', estado_id: 1 },
      { nombre: 'Folk', descripcion: 'Música folk y tradicional', estado_id: 1 },
      { nombre: 'Blues', descripcion: 'Blues tradicional y moderno', estado_id: 1 },
      { nombre: 'Country', descripcion: 'Música country y americana', estado_id: 1 },
      { nombre: 'Reggaeton', descripcion: 'Reggaeton y música urbana latina', estado_id: 1 }
    ])

    // Crear algunos países principales
    await Pais.bulkCreate([
      { nombre: 'Colombia', codigo_iso: 'COL', codigo_telefono: '+57', estado_id: 1 },
      { nombre: 'México', codigo_iso: 'MEX', codigo_telefono: '+52', estado_id: 1 },
      { nombre: 'Argentina', codigo_iso: 'ARG', codigo_telefono: '+54', estado_id: 1 },
      { nombre: 'España', codigo_iso: 'ESP', codigo_telefono: '+34', estado_id: 1 },
      { nombre: 'Estados Unidos', codigo_iso: 'USA', codigo_telefono: '+1', estado_id: 1 },
      { nombre: 'Brasil', codigo_iso: 'BRA', codigo_telefono: '+55', estado_id: 1 },
      { nombre: 'Chile', codigo_iso: 'CHL', codigo_telefono: '+56', estado_id: 1 },
      { nombre: 'Perú', codigo_iso: 'PER', codigo_telefono: '+51', estado_id: 1 },
      { nombre: 'Ecuador', codigo_iso: 'ECU', codigo_telefono: '+593', estado_id: 1 },
      { nombre: 'Venezuela', codigo_iso: 'VEN', codigo_telefono: '+58', estado_id: 1 }
    ])

    logger.info("✅ Datos iniciales creados exitosamente")
  } catch (error) {
    logger.error("❌ Error al crear datos iniciales:", error)
    // No fallar el inicio del servidor por esto
  }
}

// ================================
// MANEJO DE SEÑALES DEL SISTEMA
// ================================

// Manejo graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM recibido, cerrando servidor...')
  await gracefulShutdown()
})

process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT recibido, cerrando servidor...')
  await gracefulShutdown()
})

async function gracefulShutdown() {
  try {
    // Cerrar conexiones de base de datos
    const { sequelize } = require("./config/database.sql")
    await sequelize.close()
    logger.info('💾 Conexión MySQL cerrada')

    const mongoose = require('mongoose')
    await mongoose.connection.close()
    logger.info('🍃 Conexión MongoDB cerrada')

    logger.info('✅ Servidor cerrado correctamente')
    process.exit(0)
  } catch (error) {
    logger.error('❌ Error durante el cierre:', error)
    process.exit(1)
  }
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('💥 Excepción no capturada:', error)
  gracefulShutdown()
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚫 Promesa rechazada no manejada:', reason)
  gracefulShutdown()
})

// Iniciar el servidor
startServer()

module.exports = app