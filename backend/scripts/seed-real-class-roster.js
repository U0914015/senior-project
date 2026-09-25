// seed-real-class-roster.js
// 學姊真正的班級名單，來源：前測資料/四年級家長同意書+前後測成績(1).docx
// 分組依據 401/402 班學姊自己做的「異質性分組表」（每組 1高+2中+1低），403 班（對照組）
// 該文件沒有分組表，對照組本來就沒有小組排名的設計，比照 seed-separate-arm-classes.js
// 的 CTRT01 做法，全班放同一個佔位小組。
//
// 401、402＝實驗組，403＝對照組（跟使用者確認過的分法）。
//
// ⚠️ 家長「不同意」的 4 位學生（401：羅哲宇 #5、黃若凝 #24；402：陳翊綸 #7、嚴子宸 #18）：
// 跟使用者確認過，處理方式是「建帳號但標記中離」——沿用系統既有的中離機制（withdrawn_at），
// 這樣他們可以正常登入、正常玩遊戲，但小組共同總分/共同獎章會把他們排除在外重算，不會因為
// 家長不同意研究分析卻仍然影響到其他同意的組員的團隊數據。
// 401 班學姊自己的分組表把這 2 位直接編進正常的第3組/第4組（沒有另外歸類），402 班的分組表
// 則把陳翊綸、嚴子宸另外跟 2 位「同意」的同學（韓予喬 #24、蔡秉宸 #14）一起歸成「第6組(不記入)」。
// 這裡忠實照學姊文件的分組結構建組（401 的 3/4組維持原樣、402 建出第6組），中離標記只精準蓋在
// 這 4 位真正「不同意」的學生身上——韓予喬、蔡秉宸雖然被學姊歸在「不記入」那組，但他們家長是
// 同意的，所以不標記中離，維持正常參與研究分析。
//
// 學號規則：文件裡只有座號、沒有真正的校務學號，用「班級+兩位數座號」湊成一個帳號可以登入的
// student_id（例如 401 班座號 1 號 → 40101），跟真實學號無關，純粹是這個系統登入用的帳號。
// 密碼統一先設一個好記的預設值，讓老師可以直接口頭告訴全班，之後要不要換成個別密碼再自行調整。
//
// 執行方式：
//   node scripts/seed-real-class-roster.js
require('dotenv').config()
const bcrypt = require('bcrypt')
const db = require('../db')
const roster = require('./real-roster-401-402-403.json')

const DEFAULT_PASSWORD = 'hero1234'

async function main() {
  const [[teacher]] = await db.query(
    "SELECT user_id FROM users WHERE student_id = 'T001' AND role = 'teacher'"
  )
  if (!teacher) throw new Error('找不到 T001 教師帳號，請先跑 seed-test-accounts.js')
  const teacherId = teacher.user_id

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12)

  const classDefs = [
    { key: '401', class_name: '401 班（實驗組）', class_code: 'C0401', experiment_group: 'experimental' },
    { key: '402', class_name: '402 班（實驗組）', class_code: 'C0402', experiment_group: 'experimental' },
    { key: '403', class_name: '403 班（對照組）', class_code: 'C0403', experiment_group: 'control' },
  ]

  const summary = {}

  for (const def of classDefs) {
    const [classResult] = await db.query(
      `INSERT INTO classes (class_name, class_code, teacher_id, experiment_group, max_group_size)
       VALUES (?, ?, ?, ?, 4)`,
      [def.class_name, def.class_code, teacherId, def.experiment_group]
    )
    const classId = classResult.insertId

    const students = roster[def.key]

    // 建小組：401/402 照學姊分組表裡實際出現過的組名建組；403 對照組沒有分組表，
    // 全班共用一個佔位小組（滿足資料庫外鍵，對照組學生本來就看不到組別/隊友）
    const groupNameToId = {}
    if (def.key === '403') {
      const [g] = await db.query(
        "INSERT INTO `groups` (class_id, group_name) VALUES (?, '對照組（不分小組）')", [classId]
      )
      groupNameToId['__all__'] = g.insertId
    } else {
      const groupNames = [...new Set(students.map(s => s.group_name))]
      for (const name of groupNames) {
        const [g] = await db.query(
          "INSERT INTO `groups` (class_id, group_name) VALUES (?, ?)", [classId, name]
        )
        groupNameToId[name] = g.insertId
      }
    }

    let created = 0
    let withdrawn = 0
    for (const s of students) {
      const studentId = `${def.key}${String(s.seat).padStart(2, '0')}`
      const groupId = def.key === '403' ? groupNameToId['__all__'] : groupNameToId[s.group_name]
      const withdrawnAt = s.declined ? new Date() : null
      await db.query(
        `INSERT INTO users
           (student_id, nickname, password_hash, role, class_id, group_id, is_leader, withdrawn_at)
         VALUES (?, ?, ?, 'student', ?, ?, 0, ?)`,
        [studentId, s.name, passwordHash, classId, groupId, withdrawnAt]
      )
      created++
      if (s.declined) withdrawn++
    }

    summary[def.key] = {
      class_id: classId,
      class_code: def.class_code,
      experiment_group: def.experiment_group,
      students_created: created,
      withdrawn_marked: withdrawn,
      groups: Object.keys(groupNameToId).length,
    }
  }

  console.log(JSON.stringify({
    teacher: { student_id: 'T001', password: 'teacher123' },
    student_password_default: DEFAULT_PASSWORD,
    student_id_format: '<班級><兩位數座號>，例如 401 班座號 1 號 = 40101',
    classes: summary,
  }, null, 2))

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
