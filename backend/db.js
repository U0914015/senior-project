require('dotenv').config()
const mysql = require('mysql2/promise')

// 判斷是否使用 Unix Socket（Cloud Run 連 Cloud SQL 用）
// 如果 DB_HOST 開頭是 /cloudsql，就用 socketPath 連線
const isCloudSQL = process.env.DB_HOST?.startsWith('/cloudsql')

const poolConfig = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
   // 用小寫的 utf8mb4，這是 mysql2 官方文件推薦的寫法
  charset: 'utf8mb4',
  // charset:            'UTF8MB4_UNICODE_CI',   // ← 改成大寫加底線格式
}

if (isCloudSQL) {
  // Cloud Run 環境：用 Unix Socket 連線
poolConfig.socketPath = process.env.DB_HOST
} else {
  // 本機環境：用一般 host + port 連線
  poolConfig.host = process.env.DB_HOST || '127.0.0.1'
  poolConfig.port = process.env.DB_PORT || 3306
  // Managed MySQL requires TLS; certificate validation must remain enabled.
  if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = { rejectUnauthorized: true }
    if (process.env.DB_SSL_CA) {
      poolConfig.ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n')
    }
  }
}

const pool = mysql.createPool(poolConfig)

// pool 的 charset 設定只在「建立新連線」當下的 handshake 生效。
// 若只在單一 query 上跑 SET NAMES，只會套用到當次借到的那條連線，
// pool 裡其他連線（connectionLimit 內尚未跑過 SET NAMES 的）在 Cloud SQL
// 上可能仍使用 server 端預設 charset，導致 emoji 等 4-byte 字元被轉成 '?'。
// 監聽 'connection' event，確保每條新建立的實體連線都强制 SET NAMES。
pool.on('connection', (connection) => {
  connection.query("SET NAMES utf8mb4")
})

module.exports = pool
