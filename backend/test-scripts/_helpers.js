// 共用的極簡 HTTP client，三支測試腳本都靠這個打後端 API。
// 用 Node 內建 http 模組而不是 curl，是因為 Windows Git Bash 終端機編碼
// 不保證是 UTF-8，直接在命令列打中文字串傳給後端可能會存成亂碼（實測發生過）。
const http = require('http')

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json; charset=utf-8' }
    if (token) headers['Authorization'] = 'Bearer ' + token
    if (data) headers['Content-Length'] = Buffer.byteLength(data)

    const req = http.request(
      { hostname: 'localhost', port: 3001, path: '/api' + path, method, headers },
      res => {
        let body = ''
        res.on('data', c => (body += c))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) })
          } catch {
            resolve({ status: res.statusCode, data: body })
          }
        })
      }
    )
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

// 回傳 { token, user }，user 裡有 class_id/group_id/experiment_group 等欄位，
// 測試腳本常常需要這些值（例如打 group-scores API 要自己帶 class_id）
async function login(student_id, password, role) {
  const { data } = await api('POST', '/auth/login', { student_id, password, role })
  if (!data.token) throw new Error(`登入失敗：${student_id} — ${JSON.stringify(data)}`)
  return { token: data.token, user: data.user }
}

function ok(label, condition, detail = '') {
  console.log(`${condition ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`)
  return condition
}

module.exports = { api, login, ok }
