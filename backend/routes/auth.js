const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const db      = require('../db')

// ── 註冊 ──────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { student_id, nickname, password, class_code } = req.body

    if (!student_id || !nickname || !password || !class_code)
      return res.status(400).json({ error: '所有欄位皆必填' })

    const [classes] = await db.query(
      'SELECT class_id FROM classes WHERE class_code = ?', [class_code]
    )
    if (!classes.length)
      return res.status(404).json({ error: '班級代碼不存在' })

    const password_hash = await bcrypt.hash(password, 12)
    const [result] = await db.query(
      `INSERT INTO users (student_id, nickname, password_hash, role, class_id)
       VALUES (?, ?, ?, 'student', ?)`,
      [student_id, nickname, password_hash, classes[0].class_id]
    )
    res.status(201).json({ message: '註冊成功', user_id: result.insertId })

  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: '學號已被註冊' })
    console.error(e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// ── 登入 ──────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { student_id, password, role } = req.body

    const [rows] = await db.query(
      'SELECT * FROM users WHERE student_id = ? AND role = ?',
      [student_id, role]
    )
    if (!rows.length)
      return res.status(401).json({ error: '帳號或密碼錯誤' })

    const user = rows[0]
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match)
      return res.status(401).json({ error: '帳號或密碼錯誤' })

    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE user_id = ?', [user.user_id]
    )

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, class_id: user.class_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

// 查詢時加上 experiment_group（學生個人若有被教師覆寫過，優先用學生自己的設定，
// 否則沿用班級預設值。這裡刻意不用 u.*，避免跟 c.experiment_group 撞同名欄位
// 導致物件屬性互相覆蓋）
const [[userWithClass]] = await db.query(
  `SELECT COALESCE(u.experiment_group, c.experiment_group) AS experiment_group,
          c.class_name, g.group_name
   FROM users u
   LEFT JOIN classes c ON c.class_id = u.class_id
   LEFT JOIN \`groups\` g ON g.group_id = u.group_id
   WHERE u.user_id = ?`,
  [user.user_id]
)

res.json({
  token,
  user: {
    user_id:          user.user_id,
    nickname:         user.nickname,
    role:             user.role,
    system_score:     user.system_score,
    social_score:     user.social_score,
    is_leader:        user.is_leader,
    class_id:         user.class_id,
    group_id:         user.group_id,
    experiment_group: userWithClass.experiment_group,
    class_name:       userWithClass.class_name,
    group_name:       userWithClass.group_name,
  }
})
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

module.exports = router