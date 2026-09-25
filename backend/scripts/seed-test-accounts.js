require('dotenv').config()
const bcrypt = require('bcrypt')
const db = require('../db')

async function main() {
  const teacherPass = 'teacher123'
  const teacherHash = await bcrypt.hash(teacherPass, 12)

  const [teacherResult] = await db.query(
    `INSERT INTO users (student_id, nickname, password_hash, role)
     VALUES (?, ?, ?, 'teacher')`,
    ['T001', '測試老師', teacherHash]
  )
  const teacherId = teacherResult.insertId

  const classCode = 'ABC123'
  const [classResult] = await db.query(
    `INSERT INTO classes (class_name, class_code, teacher_id, experiment_group, max_group_size)
     VALUES (?, ?, ?, 'control', 4)`,
    ['測試班級', classCode, teacherId]
  )
  const classId = classResult.insertId

  console.log(JSON.stringify({
    teacher: { student_id: 'T001', password: teacherPass, role: 'teacher', user_id: teacherId },
    class: { class_id: classId, class_code: classCode },
  }, null, 2))

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
