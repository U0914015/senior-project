const jwt = require('jsonwebtoken')

module.exports = function(req, res, next) {
  const header = req.headers['authorization']
  if (!header) return res.status(401).json({ error: '未提供 token' })

  const token = header.split(' ')[1]
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token 無效或已過期' })
  }
}