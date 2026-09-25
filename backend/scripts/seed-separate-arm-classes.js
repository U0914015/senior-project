// seed-separate-arm-classes.js
// 學姊確認：實驗組/對照組會是「分開的班級」，不是同一班用個人覆寫混著跑。
// 這支腳本補建兩個乾淨的示範班級（各自維持一個 experiment_group 預設值，
// 不用個人覆寫），給學姊/學生實際測試用。
//
// 不會動到既有的「測試班級」(ABC123)，那個班級是用來測試「個人覆寫」
// 這個功能本身的，跟這裡的「兩個班級分開跑」是不同的測試情境，兩個都留著。
//
// 執行方式：
//   node scripts/seed-separate-arm-classes.js
require('dotenv').config()
const bcrypt = require('bcrypt')
const db = require('../db')

async function main() {
  const [[teacher]] = await db.query(
    "SELECT user_id FROM users WHERE student_id = 'T001' AND role = 'teacher'"
  )
  if (!teacher) throw new Error('找不到 T001 教師帳號，請先跑 seed-test-accounts.js')
  const teacherId = teacher.user_id

  const studentPass = 'test1234'
  const studentHash = await bcrypt.hash(studentPass, 12)

  // ── 實驗組班級：2組 x 3人 ──────────────────────────────
  const [expClass] = await db.query(
    `INSERT INTO classes (class_name, class_code, teacher_id, experiment_group, max_group_size)
     VALUES ('三年A班（實驗組）', 'EXPT01', ?, 'experimental', 4)`,
    [teacherId]
  )
  const expClassId = expClass.insertId

  const [expGroupA] = await db.query(
    "INSERT INTO `groups` (class_id, group_name) VALUES (?, '甲組')", [expClassId]
  )
  const [expGroupB] = await db.query(
    "INSERT INTO `groups` (class_id, group_name) VALUES (?, '乙組')", [expClassId]
  )

  const expStudents = [
    { id: 'E01', nickname: '實驗甲組長', groupId: expGroupA.insertId, leader: 1 },
    { id: 'E02', nickname: '實驗甲組員一', groupId: expGroupA.insertId, leader: 0 },
    { id: 'E03', nickname: '實驗甲組員二', groupId: expGroupA.insertId, leader: 0 },
    { id: 'E04', nickname: '實驗乙組長', groupId: expGroupB.insertId, leader: 1 },
    { id: 'E05', nickname: '實驗乙組員一', groupId: expGroupB.insertId, leader: 0 },
    { id: 'E06', nickname: '實驗乙組員二', groupId: expGroupB.insertId, leader: 0 },
  ]
  for (const s of expStudents) {
    await db.query(
      `INSERT INTO users (student_id, nickname, password_hash, role, class_id, group_id, is_leader)
       VALUES (?, ?, ?, 'student', ?, ?, ?)`,
      [s.id, s.nickname, studentHash, expClassId, s.groupId, s.leader]
    )
  }

  // ── 對照組班級：1組 6人（對照組沒有小組概念，分組純粹是滿足資料庫外鍵，
  // 學生自己完全看不到組別/隊友） ────────────────────────
  const [ctrlClass] = await db.query(
    `INSERT INTO classes (class_name, class_code, teacher_id, experiment_group, max_group_size)
     VALUES ('三年B班（對照組）', 'CTRT01', ?, 'control', 6)`,
    [teacherId]
  )
  const ctrlClassId = ctrlClass.insertId

  const [ctrlGroup] = await db.query(
    "INSERT INTO `groups` (class_id, group_name) VALUES (?, '丙組')", [ctrlClassId]
  )

  const ctrlStudents = [
    { id: 'C01', nickname: '對照生一' },
    { id: 'C02', nickname: '對照生二' },
    { id: 'C03', nickname: '對照生三' },
    { id: 'C04', nickname: '對照生四' },
    { id: 'C05', nickname: '對照生五' },
    { id: 'C06', nickname: '對照生六' },
  ]
  for (const s of ctrlStudents) {
    await db.query(
      `INSERT INTO users (student_id, nickname, password_hash, role, class_id, group_id, is_leader)
       VALUES (?, ?, ?, 'student', ?, ?, 0)`,
      [s.id, s.nickname, studentHash, ctrlClassId, ctrlGroup.insertId]
    )
  }

  console.log(JSON.stringify({
    teacher: { student_id: 'T001', password: 'teacher123' },
    experimental_class: { class_id: expClassId, class_code: 'EXPT01', students: expStudents.map(s => s.id) },
    control_class:      { class_id: ctrlClassId, class_code: 'CTRT01', students: ctrlStudents.map(s => s.id) },
    student_password: studentPass,
  }, null, 2))

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
