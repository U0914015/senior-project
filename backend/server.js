require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5174', // senior-project 前端本機開發 port（跟 pk-english-game 的 5173 錯開）
    // firebase.json 的 site 已經設成 pk-english-senior，實際網址是
    // https://pk-english-senior.web.app——要先用 firebase CLI 建好這個 site
    // （firebase hosting:sites:create pk-english-senior）網址才會真的存在
    'https://pk-english-senior.web.app'
  ],
  credentials: true
}))
app.use(express.json())

app.use('/api/auth',   require('./routes/auth'))
app.use('/api/users',  require('./routes/users'))
app.use('/api/questions', require('./routes/questions'))
app.use('/api/game',   require('./routes/game'))
app.use('/api/social', require('./routes/social'))
app.use('/api/teacher', require('./routes/teacher'))   


const { router: badgesRouter } = require('./routes/badges')
app.use('/api/badges', badgesRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: '伺服器內部錯誤' })
})

const PORT = process.env.PORT || 3000
if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`))
}

module.exports = app
