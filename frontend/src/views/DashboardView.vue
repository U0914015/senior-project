<template>
  <div class="dashboard-page">

    <!-- ══ 側邊欄 ══ -->
    <aside class="sidebar" :class="{ collapsed: sideCollapsed }">
      <div class="sidebar-logo">
        <span class="logo-icon">⚔️</span>
        <span v-if="!sideCollapsed" class="logo-txt">英語小勇士後台</span>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="item in navItems" :key="item.id"
          class="nav-item" :class="{ active: activeNav === item.id }"
          @click="activeNav = item.id"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span v-if="!sideCollapsed" class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <!-- 登出按鈕在側邊欄底部 -->
      <button class="logout-btn" @click="doLogout">
        <span class="nav-icon">🚪</span>
        <span v-if="!sideCollapsed" class="nav-label">登出</span>
      </button>

      <button class="collapse-btn" @click="sideCollapsed = !sideCollapsed">
        {{ sideCollapsed ? '→' : '←' }}
      </button>
    </aside>

    <!-- ══ 主內容區 ══ -->
    <main class="main-content">

      <!-- 頂部工具列 -->
      <header class="dash-header">
        <div class="header-left">
          <h1 class="page-title">{{ currentNavLabel }}</h1>
          <select v-model="selectedClassId" class="class-select" @change="fetchAll">
            <option v-for="c in classes" :key="c.class_id" :value="c.class_id">
              {{ c.class_name }}
            </option>
          </select>
          <label class="study-start-label" title="研究/前測正式開始日——之後才建立帳號的學生會被標記為「晚加入」（例如從別校轉進來），不影響他們使用系統，只是方便分析時判斷誰缺前測基準值">
            📅 研究開始日
            <input
              type="date"
              class="study-start-input"
              :value="currentClass?.study_start_date?.slice(0,10) ?? ''"
              @change="setStudyStartDate($event.target.value)"
            />
          </label>
        </div>
        <div class="header-right">
          <div class="group-toggle">
            <button class="toggle-btn" :class="{ active: viewGroup === 'all' }"          @click="viewGroup = 'all'">全班</button>
            <button class="toggle-btn" :class="{ active: viewGroup === 'experimental' }" @click="viewGroup = 'experimental'">實驗組</button>
            <button class="toggle-btn" :class="{ active: viewGroup === 'control' }"      @click="viewGroup = 'control'">對照組</button>
          </div>
          <button class="export-btn" @click="openScoreboard">📺 大字報</button>
          <button class="export-btn" @click="exportCSV">📥 匯出 CSV</button>
          <div class="teacher-chip">👤 {{ authStore.user?.nickname }}</div>
        </div>
      </header>

      <!-- ══ 頁面：總覽 ══ -->
      <div v-if="activeNav === 'overview'" class="page-body">
        <div class="kpi-grid">
          <div v-for="kpi in kpiCards" :key="kpi.label" class="kpi-card">
            <div class="kpi-icon">{{ kpi.icon }}</div>
            <div class="kpi-right">
              <div class="kpi-val">{{ kpi.value }}</div>
              <div class="kpi-label">{{ kpi.label }}</div>
              <div class="kpi-caption">{{ kpi.caption }}</div>
            </div>
          </div>
        </div>
        <div class="chart-row">
          <div class="chart-card">
            <div class="chart-title">
              答題分數趨勢（近 7 場）
            </div>
            <svg class="line-chart" viewBox="0 0 320 120" preserveAspectRatio="none">
              <line v-for="y in [20,50,80,110]" :key="y" :x1="0" :y1="y" :x2="320" :y2="y" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
              <polyline :points="sysLinePoints" fill="none" stroke="#FF8C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle v-for="(pt,i) in sysPoints" :key="'s'+i" :cx="pt.x" :cy="pt.y" r="3" fill="#FF8C00"/>
            </svg>
            <div class="chart-x-labels"><span v-for="(l,i) in chartLabels" :key="i">{{ l }}</span></div>
          </div>
          <div class="chart-card">
            <div class="chart-title">各關卡正確率</div>
            <div class="bar-chart">
              <div v-for="lv in levelStats" :key="lv.name" class="bar-row">
                <span class="bar-label">{{ lv.icon }} {{ lv.name }}</span>
                <div class="bar-track"><div class="bar-fill" :class="`fill-${lv.color}`" :style="{ width: lv.accuracy+'%' }"/></div>
                <span class="bar-val">{{ lv.accuracy }}%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="chart-row">
          <div class="chart-card">
            <div class="chart-title">PK 參與率</div>
            <div class="metric-list">
              <div v-for="m in participationMetrics" :key="m.label" class="metric-row">
                <span class="metric-label">{{ m.label }}</span>
                <div class="metric-bar-wrap">
                  <div class="metric-bar"><div class="metric-fill" :style="{ width: m.value+'%' }" :class="`fill-${m.color}`"/></div>
                  <span class="metric-val">{{ m.value }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 研究用原始資料匯出 -->
        <div class="new-group-card">
          <h3 class="card-sec-title">📤 研究資料匯出</h3>
          <div class="new-group-row">
            <button class="action-btn create-btn" @click="exportGameLogs">📝 完整答題紀錄</button>
            <button class="action-btn create-btn" @click="exportBadges">🏅 獎章獲得紀錄</button>
          </div>
        </div>
      </div>

      <!-- ══ 頁面：學生資料表 ══ -->
      <div v-if="activeNav === 'students'" class="page-body">
        <div class="table-toolbar">
          <input v-model="searchQuery" class="search-input" placeholder="🔍 搜尋學生姓名…"/>
          <select v-model="sortKey" class="sort-select">
            <option value="system_score">依答題分數排序</option>
            <option value="accuracy">依正確率排序</option>
            <option value="total_games">依PK場次排序</option>
          </select>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>名次</th><th>學生</th><th>組別</th><th>分組</th><th>出席</th>
                <th>答題分數⚡</th><th>PK次數</th>
                <th>正確率</th><th>PERR</th><th>STD</th><th>紀錄</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s,idx) in filteredStudents" :key="s.user_id" :class="{ 'row-me': s.is_leader }">
                <td class="rank-td">{{ idx < 3 ? ['🥇','🥈','🥉'][idx] : idx+1 }}</td>
                <td class="name-td">
                  <div class="student-av" :style="{ background: s.color }">{{ s.nickname.charAt(0) }}</div>
                  {{ s.nickname }}
                  <span v-if="s.is_leader" class="leader-badge">組長</span>
                  <span
                    v-if="s.is_late_joiner"
                    class="late-joiner-badge"
                    title="這個帳號是研究開始日之後才建立的，沒有經歷過前測、沒被隨機分派過（例如從別校轉進來），分析時可能要另外處理"
                  >🆕 晚加入</span>
                  <span
                    v-if="s.is_withdrawn"
                    class="withdrawn-badge"
                    title="已標記中離：仍能登入使用系統，但不計入小組平均/團體獎章，分析時排除"
                  >🚪 已中離</span>
                </td>
                <td>{{ s.group_name }}</td>
                <td>
                  <select
                    class="group-move-select exp-select"
                    :class="s.experiment_group"
                    :value="s.is_group_override ? s.experiment_group : ''"
                    @change="setExperimentGroup(s, $event.target.value)"
                  >
                    <option value="">沿用班級（{{ s.experiment_group === 'experimental' ? '實驗組' : '對照組' }}）</option>
                    <option value="experimental">實驗組（教師覆寫）</option>
                    <option value="control">對照組（教師覆寫）</option>
                  </select>
                </td>
                <td>
                  <button
                    class="attendance-toggle"
                    :class="{ absent: s.is_absent_today }"
                    @click="toggleAttendance(s)"
                  >
                    {{ s.is_absent_today ? '🏠 請假中' : '✅ 在班' }}
                  </button>
                </td>
                <td class="num-td sys-td">{{ s.system_score }}</td>
                <td class="num-td">{{ s.total_games }}</td>
                <td class="num-td"><span :class="accClass(s.accuracy)">{{ s.accuracy }}%</span></td>
                <td class="num-td">{{ s.perr ?? '—' }}{{ s.perr !== null ? '%' : '' }}</td>
                <td class="num-td">{{ s.std ?? '—' }}</td>
                <td>
                  <button class="leader-toggle" @click="openStudentLogs(s)">📋 詳細</button>
                  <button
                    v-if="classes.length > 1"
                    class="leader-toggle"
                    @click="openTransferModal(s)"
                  >🔄 轉班</button>
                  <button class="leader-toggle" @click="toggleWithdrawn(s)">
                    {{ s.is_withdrawn ? '↩️ 取消中離' : '🚪 標記中離' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 轉學生保留帳號 Modal -->
      <div v-if="transferModal" class="modal-backdrop" @click.self="closeTransferModal">
        <div class="modal-box">
          <div class="modal-box-header">
            <h3>把 {{ transferModal.student.nickname }} 轉到另一個班級</h3>
            <button class="modal-close-btn" @click="closeTransferModal">✕</button>
          </div>
          <p class="transfer-note">
            會沿用同一個帳號，答題紀錄跟獎章都不會不見；實驗組別會維持轉班前的設定
            （目前是「{{ transferModal.student.experiment_group === 'experimental' ? '實驗組' : '對照組' }}」），
            不會因為新班級的預設組別不同而被換掉。轉過去之後小組是空的，要到「小組管理」頁重新分組。
          </p>
          <select v-model="transferModal.targetClassId" class="sort-select">
            <option :value="null" disabled>請選擇要轉去的班級</option>
            <option
              v-for="c in classes.filter(c => c.class_id !== selectedClassId)"
              :key="c.class_id" :value="c.class_id"
            >{{ c.class_name }}</option>
          </select>
          <div class="transfer-actions">
            <button class="action-btn create-btn" :disabled="!transferModal.targetClassId" @click="submitTransfer">
              確認轉班
            </button>
            <button class="leader-toggle" @click="closeTransferModal">取消</button>
          </div>
        </div>
      </div>

      <!-- 單一學生答題紀錄 Modal -->
      <div v-if="studentLogsModal" class="modal-backdrop" @click.self="closeStudentLogs">
        <div class="modal-box">
          <div class="modal-box-header">
            <h3>{{ studentLogsModal.student.nickname }} 的答題紀錄（共 {{ studentLogsModal.logs.length }} 筆）</h3>
            <button class="modal-close-btn" @click="closeStudentLogs">✕</button>
          </div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>場次</th><th>題型</th><th>題目</th><th>作答</th>
                  <th>對錯</th><th>秒數</th><th>得分</th><th>時間</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in studentLogsModal.logs" :key="log.log_id">
                  <td>{{ log.session_id }}</td>
                  <td>{{ log.question_type }}</td>
                  <td style="max-width:260px">{{ log.question_text }}</td>
                  <td>{{ log.user_answer || '—' }}</td>
                  <td>{{ log.is_correct ? '✅' : '❌' }}</td>
                  <td>{{ log.response_time }}</td>
                  <td>{{ log.score }}</td>
                  <td>{{ new Date(log.answered_at).toLocaleString() }}</td>
                </tr>
                <tr v-if="studentLogsModal.logs.length === 0">
                  <td colspan="8" style="text-align:center; color:rgba(255,255,255,.4)">這位學生還沒有答題紀錄</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ══ 頁面：比較組分析 ══ -->
      <div v-if="activeNav === 'compare'" class="page-body">
        <div class="compare-grid">
          <div class="compare-card experimental">
            <div class="cc-header"><span class="exp-tag experimental">實驗組</span><span class="cc-count">{{ expGroup.length }} 人</span></div>
            <div class="cc-stats">
              <div class="cc-stat"><span class="cc-val">{{ expAvg.system }}</span><span class="cc-lbl">平均答題分數</span></div>
              <div class="cc-stat"><span class="cc-val">{{ expAvg.accuracy }}%</span><span class="cc-lbl">平均正確率</span></div>
              <div class="cc-stat"><span class="cc-val">{{ expAvg.games }}</span><span class="cc-lbl">平均PK場次</span></div>
              <div class="cc-stat"><span class="cc-val">{{ expAvg.perr }}%</span><span class="cc-lbl">挫折後重試率</span></div>
              <div class="cc-stat"><span class="cc-val">{{ expAvg.std }}題</span><span class="cc-lbl">自我超越時數</span></div>
            </div>
          </div>
          <div class="compare-vs-col">
            <div class="cv-badge">VS</div>
            <div class="cv-items">
              <div v-for="m in compareMetrics" :key="m.label" class="cv-item">
                <span class="cv-label">{{ m.label }}</span>
                <div class="cv-bar-wrap"><div class="cv-bar-exp" :style="{ flex: m.expVal }"/><div class="cv-bar-ctrl" :style="{ flex: m.ctrlVal }"/></div>
                <div class="cv-nums"><span class="cv-exp">{{ m.expDisplay }}</span><span class="cv-ctrl">{{ m.ctrlDisplay }}</span></div>
              </div>
            </div>
          </div>
          <div class="compare-card control">
            <div class="cc-header"><span class="exp-tag control">對照組</span><span class="cc-count">{{ ctrlGroup.length }} 人</span></div>
            <div class="cc-stats">
              <div class="cc-stat"><span class="cc-val">{{ ctrlAvg.system }}</span><span class="cc-lbl">平均答題分數</span></div>
              <div class="cc-stat"><span class="cc-val">{{ ctrlAvg.accuracy }}%</span><span class="cc-lbl">平均正確率</span></div>
              <div class="cc-stat"><span class="cc-val">{{ ctrlAvg.games }}</span><span class="cc-lbl">平均PK場次</span></div>
              <div class="cc-stat"><span class="cc-val">{{ ctrlAvg.perr }}%</span><span class="cc-lbl">挫折後重試率</span></div>
              <div class="cc-stat"><span class="cc-val">{{ ctrlAvg.std }}題</span><span class="cc-lbl">自我超越時數</span></div>
            </div>
          </div>
        </div>
        <div class="diff-summary">
          <div class="diff-title">📊 差異摘要（實驗組 vs 對照組）</div>
          <div class="diff-grid">
            <div v-for="d in diffItems" :key="d.label" class="diff-item" :class="d.better ? 'diff-pos' : 'diff-neg'">
              <span class="diff-icon">{{ d.better ? '↑' : '↓' }}</span>
              <div><div class="diff-label">{{ d.label }}</div><div class="diff-val">{{ d.value }}</div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ 頁面：組別管理 ══ -->
      <div v-if="activeNav === 'groups'" class="page-body">

        <!-- 提示 -->
        <div class="group-tip">
          💡 在這裡設定每位學生的小組、組長身份，以及是否為實驗組或對照組
        </div>

        <!-- 建立新小組 -->
        <div class="new-group-card">
          <h3 class="card-sec-title">➕ 建立新小組</h3>
          <div class="new-group-row">
            <input
              v-model="newGroupName"
              class="search-input"
              placeholder="輸入小組名稱（例如：C 組）"
              style="max-width:240px"
            />
            <select v-model="newGroupType" class="sort-select">
              <option value="experimental">實驗組</option>
              <option value="control">對照組</option>
            </select>
            <button class="action-btn create-btn" @click="createGroup">
              建立小組
            </button>
          </div>
        </div>

        <!-- 一鍵隨機分組 -->
        <div class="new-group-card">
          <h3 class="card-sec-title">🎲 一鍵隨機分組</h3>
          <p style="font-size:12px; color:rgba(255,255,255,.5); margin:0 0 12px">
            把「尚未分組的學生」隨機平均分配到班上已存在的小組（不會超過每組人數上限，也不會自動建立新小組）
          </p>
          <button class="action-btn create-btn" @click="autoGroup">
            🎲 開始隨機分組
          </button>
        </div>

        <!-- 班級組別一覽 -->
        <div class="group-cards">
          <div v-for="g in groupList" :key="g.group_id" class="group-manage-card">
            <!-- 組別標題 -->
            <div class="gm-header">
              <span class="gm-name">{{ g.group_name }}</span>
              <span class="exp-tag" :class="g.experiment_group">
                {{ g.experiment_group === 'experimental' ? '實驗組' : '對照組' }}
              </span>
              <span class="gm-count">{{ g.members.length }} 人</span>
            </div>

            <!-- 組員列表 -->
            <div class="gm-members">
              <div v-for="m in g.members" :key="m.user_id" class="gm-member-row">
                <!-- 頭像 + 暱稱 -->
                <div class="gm-av" :style="{ background: m.color }">{{ m.nickname.charAt(0) }}</div>
                <span class="gm-nick">{{ m.nickname }}</span>

                <!-- 設定組長 -->
                <button
                  class="leader-toggle"
                  :class="{ 'is-leader': m.is_leader }"
                  @click="toggleLeader(m)"
                  :title="m.is_leader ? '取消組長' : '設為組長'"
                >
                  {{ m.is_leader ? '👑 組長' : '設為組長' }}
                </button>

                <!-- 調換小組 -->
                <select
                  class="group-move-select"
                  :value="m.group_id"
                  @change="moveStudent(m, $event.target.value)"
                >
                  <option v-for="g2 in groupList" :key="g2.group_id" :value="g2.group_id">
                    {{ g2.group_name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- 未分組學生 -->
        <div v-if="ungroupedStudents.length > 0" class="ungroup-card">
          <div class="gm-header">
            <span class="gm-name">⚠️ 尚未分組的學生</span>
            <span class="gm-count">{{ ungroupedStudents.length }} 人</span>
          </div>
          <div class="gm-members">
            <div v-for="m in ungroupedStudents" :key="m.user_id" class="gm-member-row">
              <div class="gm-av" style="background:#A6842E">{{ m.nickname.charAt(0) }}</div>
              <span class="gm-nick">{{ m.nickname }}</span>
              <select
                class="group-move-select"
                value=""
                @change="moveStudent(m, $event.target.value)"
              >
                <option value="" disabled>指定小組</option>
                <option v-for="g2 in groupList" :key="g2.group_id" :value="g2.group_id">
                  {{ g2.group_name }}
                </option>
              </select>
            </div>
          </div>
        </div>

      </div>

      <!-- ══ 頁面：場次管理 ══ -->
      <div v-if="activeNav === 'sessions'" class="page-body">
        <div class="group-tip">
          💡 這裡可以查看班上所有 PK 場次，測試時如果卡在「進行中」出不來，可以強制結束。
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>場次 ID</th><th>關卡</th><th>對戰組別</th><th>狀態</th>
                <th>勝方</th><th>開始時間</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sessions" :key="s.session_id">
                <td>{{ s.session_id }}</td>
                <td>{{ s.level }}</td>
                <td>{{ s.group_a_name }} vs {{ s.group_b_name }}</td>
                <td>
                  <span class="exp-tag" :class="s.status === 'completed' ? 'control' : 'experimental'">
                    {{ sessionStatusLabel(s.status) }}
                  </span>
                </td>
                <td>{{ s.winner_group_id ?? '—' }}</td>
                <td>{{ s.started_at ? new Date(s.started_at).toLocaleString() : '—' }}</td>
                <td>
                  <button
                    v-if="s.status === 'in_progress'"
                    class="leader-toggle"
                    @click="forceEndSession(s)"
                  >⏹ 強制結束</button>
                </td>
              </tr>
              <tr v-if="sessions.length === 0">
                <td colspan="7" style="text-align:center; color:rgba(255,255,255,.4)">尚無場次紀錄</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 儲存提示 -->
      <div v-if="saveMsg" class="save-toast">{{ saveMsg }}</div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'

const router    = useRouter()
const authStore = useAuthStore()

// ── 登出 ─────────────────────────────────────────────────
// 清除登入狀態，跳回登入頁
function doLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}

// ── 側邊欄 ────────────────────────────────────────────────
const sideCollapsed = ref(false)
const activeNav     = ref('overview')

// 四個頁籤，比之前多了「組別管理」
const navItems = [
  { id: 'overview', label: '班級總覽',   icon: '📊' },
  { id: 'students', label: '學生資料',   icon: '👥' },
  { id: 'compare',  label: '比較組分析', icon: '🔬' },
  { id: 'groups',   label: '組別管理',   icon: '⚙️' },
  { id: 'sessions', label: '場次管理',   icon: '🎮' },
]
const currentNavLabel = computed(
  () => navItems.find(n => n.id === activeNav.value)?.label ?? ''
)

const currentClass = computed(
  () => classes.value.find(c => c.class_id === selectedClassId.value) ?? null
)

// ── 班級 & 篩選 ───────────────────────────────────────────
const classes         = ref([])
const selectedClassId = ref(null)
const viewGroup       = ref('all')

// ── 學生資料 ─────────────────────────────────────────────
const students    = ref([])
const searchQuery = ref('')
const sortKey     = ref('system_score')

// 單一學生答題紀錄 Modal
const studentLogsModal = ref(null)  // { student, logs } | null
async function openStudentLogs(student) {
  try {
    const { data } = await api.get(`/teacher/students/${student.user_id}/logs`)
    studentLogsModal.value = data
  } catch (e) {
    alert(e.response?.data?.error || '查詢失敗，請稍後再試')
  }
}
function closeStudentLogs() {
  studentLogsModal.value = null
}

const filteredStudents = computed(() => {
  let list = [...students.value]
  if (viewGroup.value !== 'all')
    list = list.filter(s => s.experiment_group === viewGroup.value)
  if (searchQuery.value)
    list = list.filter(s =>
      s.nickname.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  return list.sort((a, b) => (b[sortKey.value] ?? 0) - (a[sortKey.value] ?? 0))
})

const expGroup  = computed(() => students.value.filter(s => s.experiment_group === 'experimental'))
const ctrlGroup = computed(() => students.value.filter(s => s.experiment_group === 'control'))

// mysql2 對 ROUND() 這類算出來的欄位（例如 accuracy）預設回傳字串，不是數字
// （例如 accuracy: '63'）。少了 Number() 轉型，s + r[key] 在字串遇到字串時
// 會變成字串接龍而不是相加，例如 8 個學生的 accuracy 全部黏成一長串數字
// 再除以人數，就會跑出「79572591326010%」這種離譜的平均正確率。
function avg(arr, key) {
  return arr.length ? Math.round(arr.reduce((s, r) => s + (Number(r[key]) || 0), 0) / arr.length) : 0
}

const expAvg = computed(() => ({
  system:   avg(expGroup.value, 'system_score'),
  accuracy: avg(expGroup.value, 'accuracy'),
  games:    avg(expGroup.value, 'total_games'),
  perr:     avg(expGroup.value, 'perr'),
  std:      avg(expGroup.value, 'std'),
}))
const ctrlAvg = computed(() => ({
  system:   avg(ctrlGroup.value, 'system_score'),
  accuracy: avg(ctrlGroup.value, 'accuracy'),
  games:    avg(ctrlGroup.value, 'total_games'),
  perr:     avg(ctrlGroup.value, 'perr'),
  std:      avg(ctrlGroup.value, 'std'),
}))

const compareMetrics = computed(() => [
  { label:'答題分數', expVal: expAvg.value.system,   ctrlVal: ctrlAvg.value.system,   expDisplay: expAvg.value.system,        ctrlDisplay: ctrlAvg.value.system },
  { label:'正確率', expVal: expAvg.value.accuracy,  ctrlVal: ctrlAvg.value.accuracy,  expDisplay: expAvg.value.accuracy+'%',  ctrlDisplay: ctrlAvg.value.accuracy+'%' },
  { label:'PK場次', expVal: expAvg.value.games,     ctrlVal: ctrlAvg.value.games,     expDisplay: expAvg.value.games,         ctrlDisplay: ctrlAvg.value.games },
  { label:'挫折後重試率(PERR)', expVal: expAvg.value.perr, ctrlVal: ctrlAvg.value.perr, expDisplay: expAvg.value.perr+'%', ctrlDisplay: ctrlAvg.value.perr+'%' },
  { label:'自我超越時數(STD)', expVal: expAvg.value.std,  ctrlVal: ctrlAvg.value.std,  expDisplay: expAvg.value.std+'題', ctrlDisplay: ctrlAvg.value.std+'題' },
])

const diffItems = computed(() => {
  const sysDiff  = expAvg.value.system   - ctrlAvg.value.system
  const accDiff  = expAvg.value.accuracy - ctrlAvg.value.accuracy
  const gameDiff = expAvg.value.games    - ctrlAvg.value.games
  const perrDiff = expAvg.value.perr     - ctrlAvg.value.perr
  const stdDiff  = expAvg.value.std      - ctrlAvg.value.std
  return [
    { label:'平均答題分數', value: `${sysDiff  >= 0 ? '+' : ''}${sysDiff}`,   better: sysDiff  >= 0 },
    { label:'平均正確率', value: `${accDiff  >= 0 ? '+' : ''}${accDiff}%`,  better: accDiff  >= 0 },
    { label:'平均PK場次', value: `${gameDiff >= 0 ? '+' : ''}${gameDiff}`,  better: gameDiff >= 0 },
    { label:'挫折後重試率', value: `${perrDiff >= 0 ? '+' : ''}${perrDiff}%`, better: perrDiff >= 0 },
    { label:'自我超越時數', value: `${stdDiff  >= 0 ? '+' : ''}${stdDiff}題`, better: stdDiff  >= 0 },
  ]
})

// ── KPI ──────────────────────────────────────────────────
// caption 原本寫死「↑8%」「↑12%」「↑5%」這種假的成長率，不是算出來的，
// 「本週」也不對——total_games/support_sent 是累計總數，不是本週篩選過
// 的資料。沒有歷史快照可以算真的週對週成長率，與其編假數字誤導使用者，
// 全部改成如實描述數字本身是什麼的中性說明文字。
const kpiCards = computed(() => [
  { icon:'👥', label:'班級人數',   value: students.value.length,                                             caption:'在班人數' },
  { icon:'⚡', label:'平均答題分數', value: avg(students.value,'system_score'),                                caption:'全班平均' },
  { icon:'📈', label:'平均正確率', value: avg(students.value,'accuracy')+'%',                               caption:'全班平均' },
  { icon:'🎮', label:'總PK場次',   value: students.value.reduce((s,r)=>s+(r.total_games??0),0),             caption:'累計場次' },
])

// ── 圖表（接 /teacher/dashboard 回傳的真實資料）──────────
// API 原始資料
const trendRaw        = ref([])  // [{date, avg_system}]
const levelStatsRaw    = ref([])  // [{level, total_attempts, correct_count, accuracy}]
const participationRaw = ref({ participation_rate: 0 })

const chartLabels = computed(() => trendRaw.value.map(t => t.date))

function toPoints(data, maxVal) {
  const W=320, H=110, PAD=10
  if (data.length <= 1) return data.map(() => ({ x: PAD, y: H - PAD }))
  return data.map((v,i) => ({
    x: PAD + (i/(data.length-1))*(W-PAD*2),
    y: H - (v/maxVal)*(H-PAD*2) + PAD,
  }))
}
// 動態抓最大值來決定 Y 軸縮放，避免真實分數超出原本寫死的 100/50 上限
const sysMax = computed(() => Math.max(100, ...trendRaw.value.map(t => Number(t.avg_system) || 0)))
const sysPoints     = computed(() => toPoints(trendRaw.value.map(t => Number(t.avg_system) || 0), sysMax.value))
const sysLinePoints = computed(() => sysPoints.value.map(p=>`${p.x},${p.y}`).join(' '))

// level enum → 顯示用的名稱/圖示/顏色
const LEVEL_META = {
  vocabulary: { name:'單字挑戰', icon:'🌟', color:'yellow' },
  sentence:   { name:'句型挑戰', icon:'💬', color:'blue'   },
  reading:    { name:'課文挑戰', icon:'📖', color:'green'  },
}
const levelStats = computed(() => levelStatsRaw.value.map(l => ({
  name:     LEVEL_META[l.level]?.name  ?? l.level,
  icon:     LEVEL_META[l.level]?.icon  ?? '📘',
  color:    LEVEL_META[l.level]?.color ?? 'purple',
  accuracy: Number(l.accuracy) || 0,
})))

// 後端目前只算得出參與率，留存率/完課率沒有對應資料來源，
// 沒有就不列出來，不要顯示假數字。2026-09-16 拿掉社群互評後，原本這裡
// 還有一個「社群互動率」，資料來源沒了，一併拿掉
const participationMetrics = computed(() => [
  { label:'參與率', value: participationRaw.value.participation_rate ?? 0, color:'purple' },
])

// ── 工具 ─────────────────────────────────────────────────
function accClass(acc) {
  if (acc >= 80) return 'acc-great'
  if (acc >= 60) return 'acc-ok'
  return 'acc-low'
}

// 設定/取消班級的研究（前測）正式開始日——之後才建帳號的學生會被標記
// 「晚加入」（例如從別校轉進來、沒經歷過前測），純粹是標記給分析用，
// 不會限制這些學生使用系統的任何功能
async function setStudyStartDate(dateStr) {
  if (!currentClass.value) return
  try {
    await api.patch(`/teacher/classes/${currentClass.value.class_id}/study-start-date`, {
      study_start_date: dateStr || null
    })
    showSaveMsg(dateStr ? `✅ 已設定研究開始日：${dateStr}` : '✅ 已取消研究開始日')
    await fetchAll()
  } catch (e) {
    alert(e.response?.data?.error || '設定失敗，請稍後再試')
  }
}

// 設定/取消單一學生的實驗組覆寫身份（空字串 = 取消覆寫，沿用班級預設）
async function setExperimentGroup(student, value) {
  try {
    await api.patch(`/teacher/students/${student.user_id}/experiment-group`, {
      experiment_group: value || null
    })
    showSaveMsg(`✅ 已更新 ${student.nickname} 的實驗組身份`)
    await fetchAll()
  } catch (e) {
    alert(e.response?.data?.error || '設定失敗，請稍後再試')
  }
}

// 標記/取消今日請假——請假的學生在 PK 場次判斷「還要幾人才算完成」
// 時會被排除，不然小組有人沒到班，那場就永遠卡在等他答題
async function toggleAttendance(student) {
  try {
    await api.patch(`/teacher/students/${student.user_id}/attendance`, {
      absent: !student.is_absent_today
    })
    showSaveMsg(
      student.is_absent_today
        ? `✅ 已取消 ${student.nickname} 的請假`
        : `🏠 已標記 ${student.nickname} 今日請假`
    )
    await fetchAll()
  } catch (e) {
    alert(e.response?.data?.error || '設定失敗，請稍後再試')
  }
}

// 轉學生保留帳號：把學生轉到（自己管理的）另一個班級，沿用同一個帳號
const transferModal = ref(null)
function openTransferModal(student) {
  transferModal.value = { student, targetClassId: null }
}
function closeTransferModal() {
  transferModal.value = null
}
async function submitTransfer() {
  const { student, targetClassId } = transferModal.value
  if (!targetClassId) return
  try {
    const { data } = await api.patch(`/teacher/students/${student.user_id}/transfer`, {
      new_class_id: targetClassId,
    })
    showSaveMsg(`✅ ${data.message}`)
    closeTransferModal()
    await fetchAll()
  } catch (e) {
    alert(e.response?.data?.error || '轉班失敗，請稍後再試')
  }
}

// 標記/取消學生中離——仍能登入使用系統，只是不再計入小組平均/團體獎章
async function toggleWithdrawn(student) {
  const next = !student.is_withdrawn
  if (next && !confirm(`確定要標記 ${student.nickname} 中離嗎？\n他仍然可以正常登入系統，但小組共同總分/獎章將不再把他算進去。`))
    return
  try {
    await api.patch(`/teacher/students/${student.user_id}/withdraw`, { withdrawn: next })
    showSaveMsg(next ? `🚪 已標記 ${student.nickname} 中離` : `↩️ 已取消 ${student.nickname} 的中離標記`)
    await fetchAll()
  } catch (e) {
    alert(e.response?.data?.error || '設定失敗，請稍後再試')
  }
}

function openScoreboard() {
  if (!requireClassSelected()) return
  const url = router.resolve({ name: 'scoreboard', query: { class_id: selectedClassId.value } }).href
  window.open(url, '_blank')
}

function exportCSV() {
  const headers = ['名次','學生','組別','分組','晚加入(缺前測)','中離','答題分數','PK次數','正確率','PERR','STD']
  const rows = filteredStudents.value.map((s,i) => [
    i+1, s.nickname, s.group_name,
    s.experiment_group==='experimental'?'實驗組':'對照組',
    s.is_late_joiner ? '是' : '',
    s.is_withdrawn ? '是' : '',
    s.system_score, s.total_games,
    s.accuracy+'%', s.perr ?? '', s.std ?? ''
  ])
  const csv  = [headers,...rows].map(r=>r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href:url, download:'學生資料.csv' })
  a.click()
  URL.revokeObjectURL(url)
}

// ── 研究資料匯出（原始 log，欄位可能含逗號/換行，需要正確跳脫）──
function csvEscape(val) {
  const s = String(val ?? '')
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
function downloadCSV(filename, headers, rows) {
  const csv  = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href:url, download:filename })
  a.click()
  URL.revokeObjectURL(url)
}

// 防呆：需要 class_id 的操作（匯出、建組、隨機分組...）先檢查有沒有真的選到
// 班級，沒有的話明確告訴老師去選，而不是讓請求帶著空值送出去給後端擋 400，
// 或更糟——靜默 fallback 到「第一個班級」，讓老師誤以為操作的是自己正在看的班
function requireClassSelected() {
  if (!selectedClassId.value) {
    alert('請先在上方選擇班級')
    return false
  }
  return true
}

// 匯出失敗時，把實際狀態碼/訊息印出來，才看得出是後端沒部署（404）、
// 沒權限（403）還是其他問題，不要每次都只看到同一句籠統訊息
function reportExportError(label, e) {
  console.error(`[匯出失敗] ${label}`, e)
  const status = e.response?.status
  const msg    = e.response?.data?.error
  if (status) alert(`${label}失敗（HTTP ${status}）${msg ? '：' + msg : ''}`)
  else alert(`${label}失敗：連不上伺服器，請確認後端有沒有啟動`)
}

async function exportGameLogs() {
  if (!requireClassSelected()) return
  try {
    const { data } = await api.get('/teacher/export/game-logs', {
      params: { class_id: selectedClassId.value }
    })
    const headers = ['學生姓名','場次ID','題目內容','學生答案','是否正確','答題秒數','得分','答題時間']
    const rows = data.rows.map(r => [
      r.student_name, r.session_id, r.question_text, r.user_answer,
      r.is_correct ? '正確' : '錯誤', r.response_time, r.score, r.answered_at
    ])
    downloadCSV('答題紀錄.csv', headers, rows)
  } catch (e) {
    reportExportError('答題紀錄匯出', e)
  }
}

async function exportBadges() {
  if (!requireClassSelected()) return
  try {
    const { data } = await api.get('/teacher/export/badges', {
      params: { class_id: selectedClassId.value }
    })
    const tierLabel = { bronze: '銅', silver: '銀', gold: '金', legend: '傳說' }
    const headers = ['學生姓名','獎章名稱','等級','獲得時間']
    const rows = data.rows.map(r => [
      r.student_name, r.badge_name, tierLabel[r.badge_tier] ?? r.badge_tier, r.awarded_at
    ])
    downloadCSV('獎章紀錄.csv', headers, rows)
  } catch (e) {
    reportExportError('獎章紀錄匯出', e)
  }
}

// ── 場次管理 ─────────────────────────────────────────────
const sessions = ref([])

const SESSION_STATUS_LABEL = { waiting: '等待中', in_progress: '進行中', completed: '已結束' }
function sessionStatusLabel(status) {
  return SESSION_STATUS_LABEL[status] ?? status
}

async function fetchSessions() {
  try {
    const { data } = await api.get('/teacher/sessions', {
      params: { class_id: selectedClassId.value }
    })
    sessions.value = data.sessions
  } catch (e) {
    console.error('[fetchSessions]', e)
  }
}

async function forceEndSession(session) {
  if (!confirm(`確定要強制結束場次 #${session.session_id} 嗎？會依目前的分數判定勝負。`)) return
  try {
    await api.patch(`/teacher/sessions/${session.session_id}/force-end`)
    showSaveMsg(`✅ 場次 #${session.session_id} 已強制結束`)
    await fetchSessions()
  } catch (e) {
    alert(e.response?.data?.error || '操作失敗，請稍後再試')
  }
}

// ── 組別管理 ─────────────────────────────────────────────

// 所有小組列表（每組含組員）
const groupList       = ref([])
// 尚未分組的學生
const ungroupedStudents = ref([])
// 建立新組的輸入
const newGroupName    = ref('')
const newGroupType    = ref('experimental')
// 儲存成功提示
const saveMsg         = ref('')

// 顯示提示訊息 2 秒後自動消失
function showSaveMsg(msg) {
  saveMsg.value = msg
  setTimeout(() => { saveMsg.value = '' }, 2000)
}

// 建立新小組
async function createGroup() {
  if (!requireClassSelected()) return
  if (!newGroupName.value.trim()) {
    alert('請輸入小組名稱！')
    return
  }
  try {
    await api.post('/teacher/groups', {
      class_id:   selectedClassId.value,
      group_name: newGroupName.value.trim(),
    })
    newGroupName.value = ''
    showSaveMsg('✅ 小組建立成功！')
    await fetchGroups()
  } catch (e) {
    alert(e.response?.data?.error || '建立小組失敗，請稍後再試')
  }
}

// 一鍵隨機分組
async function autoGroup() {
  if (!requireClassSelected()) return
  if (!confirm('確定要把所有未分組的學生隨機分配到現有小組嗎？')) return
  try {
    const { data } = await api.post(`/teacher/classes/${selectedClassId.value}/auto-group`)
    showSaveMsg(`✅ ${data.message}`)
    await fetchGroups()
  } catch (e) {
    alert(e.response?.data?.error || '分組失敗，請稍後再試')
  }
}

// 設定/取消組長
async function toggleLeader(member) {
  const newIsLeader = member.is_leader ? 0 : 1
  try {
    await api.patch(`/teacher/students/${member.user_id}/assign-group`, {
      group_id:  member.group_id,
      is_leader: newIsLeader,
    })
    member.is_leader = newIsLeader
    showSaveMsg(`✅ 已${newIsLeader ? '設定' : '取消'} ${member.nickname} 為組長`)
  } catch {
    member.is_leader = newIsLeader
    showSaveMsg(`✅ 已更新（mock）`)
  }
}

// 把學生移到另一個小組
async function moveStudent(member, newGroupId) {
  const gid = Number(newGroupId)
  if (!gid) return
  try {
    await api.patch(`/teacher/students/${member.user_id}/assign-group`, {
      group_id:  gid,
      is_leader: 0,  // 換組後自動取消組長
    })
    showSaveMsg(`✅ 已將 ${member.nickname} 移到新小組`)
    await fetchGroups()
  } catch {
    showSaveMsg(`✅ 已更新（mock）`)
  }
}

// 取得組別和組員資料
async function fetchGroups() {
  try {
    const { data } = await api.get(`/teacher/students/${selectedClassId.value}`)
    const COLORS   = ['#FF8C00','#FF6B35','#FF6B35','#F59E0B','#FFB300','#E64A19','#F97316','#FF8C00']

    // 整理成「組別 → 組員」的格式
    const grouped = {}
    data.groups.forEach(g => {
      grouped[g.group_id] = {
        ...g,
        members: [],
      }
    })
    data.students.forEach((s, i) => {
      if (s.group_id && grouped[s.group_id]) {
        grouped[s.group_id].members.push({ ...s, color: COLORS[i % COLORS.length] })
      } else {
        ungroupedStudents.value.push({ ...s, color: '#A6842E' })
      }
    })

    groupList.value = Object.values(grouped)
  } catch {
    // Mock 資料（API 尚未建好時）
    groupList.value = [
      {
        group_id: 1, group_name: 'A 組', experiment_group: 'experimental',
        members: [
          { user_id:1, nickname:'小庇',  is_leader:1, group_id:1, color:'#FF8C00' },
          { user_id:2, nickname:'兔龜龜', is_leader:0, group_id:1, color:'#FF6B35' },
        ]
      },
      {
        group_id: 2, group_name: 'B 組', experiment_group: 'control',
        members: [
          { user_id:5, nickname:'大熊', is_leader:1, group_id:2, color:'#FFB300' },
          { user_id:6, nickname:'小花', is_leader:0, group_id:2, color:'#E64A19' },
        ]
      },
    ]
  }
}

// ── 取全部資料 ────────────────────────────────────────────
async function fetchAll() {
  try {
    const { data } = await api.get('/teacher/dashboard', {
      params: { class_id: selectedClassId.value }
    })
    students.value        = data.students
    classes.value          = data.classes
    // 後端在沒收到 class_id 時會自動 fallback 用第一個班級，但這裡的
    // selectedClassId 不會跟著同步，導致下拉選單「看起來」選到第一個班，
    // 實際上這個 ref 還是 null——之後任何直接用 selectedClassId.value
    // 當參數的呼叫（例如匯出）都會送出空的 class_id 而失敗。這裡補上同步。
    if (!selectedClassId.value)
      selectedClassId.value = data.classes[0]?.class_id ?? null
    trendRaw.value         = data.trend ?? []
    levelStatsRaw.value    = data.level_stats ?? []
    participationRaw.value = data.participation ?? { participation_rate: 0 }
  } catch {
    loadMock()
  }
  await fetchGroups()
  await fetchSessions()
}

function loadMock() {
  const COLORS = ['#FF8C00','#FF6B35','#FF6B35','#F59E0B','#FFB300','#E64A19','#F97316','#FF8C00']
  classes.value = [{ class_id:1, class_name:'五年甲班' }]
  selectedClassId.value = 1
  students.value = [
    { user_id:1, nickname:'小庇',  group_name:'A組', experiment_group:'experimental', system_score:3500, total_games:18, accuracy:80, is_leader:1, color:COLORS[0] },
    { user_id:2, nickname:'兔龜龜',group_name:'A組', experiment_group:'experimental', system_score:3200, total_games:16, accuracy:75, is_leader:0, color:COLORS[1] },
    { user_id:5, nickname:'大熊',  group_name:'B組', experiment_group:'control',      system_score:2400, total_games:13, accuracy:65, is_leader:1, color:COLORS[4] },
    { user_id:6, nickname:'小花',  group_name:'B組', experiment_group:'control',      system_score:2100, total_games:12, accuracy:62, is_leader:0, color:COLORS[5] },
  ]
  trendRaw.value = [
    { date:'6/3', avg_system:45 }, { date:'6/4', avg_system:52 },
    { date:'6/5', avg_system:58 }, { date:'6/6', avg_system:55 },
    { date:'6/7', avg_system:68 }, { date:'6/8', avg_system:72 },
    { date:'6/9', avg_system:78 },
  ]
  levelStatsRaw.value = [
    { level:'vocabulary', accuracy:78 }, { level:'sentence', accuracy:62 }, { level:'reading', accuracy:45 },
  ]
  participationRaw.value = { participation_rate: 92 }
}

onMounted(fetchAll)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Inter:wght@400;500;600&display=swap');

.dashboard-page { display:flex; min-height:100vh; background:#3D2B00; font-family:'Inter','Nunito',sans-serif; color:#FFE0B2; }

/* 側邊欄 */
.sidebar { width:220px; min-height:100vh; background:rgba(255,255,255,.03); border-right:1px solid rgba(255,255,255,.07); display:flex; flex-direction:column; padding:20px 12px; transition:width .25s; flex-shrink:0; }
.sidebar.collapsed { width:64px; }
.sidebar-logo { display:flex; align-items:center; gap:10px; padding:0 8px 20px; border-bottom:1px solid rgba(255,255,255,.07); margin-bottom:16px; }
.logo-icon { font-size:22px; flex-shrink:0; }
.logo-txt  { font-size:14px; font-weight:800; color:#fff; white-space:nowrap; }
.sidebar-nav { display:flex; flex-direction:column; gap:4px; flex:1; }
.nav-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; border:none; background:transparent; color:rgba(255,255,255,.5); font-family:'Inter',sans-serif; font-size:13px; font-weight:500; cursor:pointer; text-align:left; transition:all .15s; white-space:nowrap; }
.nav-item:hover  { background:rgba(255,255,255,.06); color:#fff; }
.nav-item.active { background:rgba(255,140,0,.2); color:#FFCC80; font-weight:600; }
.nav-icon { font-size:16px; flex-shrink:0; }
.nav-label { flex:1; }

/* 登出按鈕 */
.logout-btn { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; border:none; background:rgba(239,68,68,.1); color:#F87171; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; text-align:left; transition:all .15s; white-space:nowrap; margin-bottom:8px; }
.logout-btn:hover { background:rgba(239,68,68,.2); color:#FCA5A5; }

.collapse-btn { padding:8px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:8px; color:rgba(255,255,255,.5); cursor:pointer; font-size:14px; align-self:flex-end; transition:all .15s; }
.collapse-btn:hover { background:rgba(255,255,255,.1); color:#fff; }

/* 主內容 */
.main-content { flex:1; display:flex; flex-direction:column; min-width:0; }
.dash-header { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; background:rgba(255,255,255,.02); border-bottom:1px solid rgba(255,255,255,.07); flex-wrap:wrap; gap:12px; position:sticky; top:0; z-index:10; }
.header-left { display:flex; align-items:center; gap:14px; }
.page-title  { font-size:18px; font-weight:700; color:#fff; }
.class-select { padding:6px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#FFE0B2; font-size:13px; outline:none; cursor:pointer; }
.header-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.group-toggle { display:flex; gap:4px; }
.toggle-btn { padding:6px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04); color:rgba(255,255,255,.5); font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; }
.toggle-btn.active { background:rgba(255,140,0,.25); border-color:#FF8C00; color:#FFCC80; }
.export-btn { padding:7px 14px; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.06); color:#FFE0B2; font-size:12px; font-weight:600; cursor:pointer; }
.export-btn:hover { background:rgba(255,255,255,.12); }
.teacher-chip { padding:6px 12px; border-radius:8px; background:rgba(255,140,0,.15); border:1px solid rgba(255,140,0,.3); color:#FFCC80; font-size:12px; font-weight:600; }

/* 頁面內容 */
.page-body { padding:20px 24px; overflow-y:auto; }

/* KPI */
.kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:20px; }
.kpi-card { display:flex; align-items:center; gap:12px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:14px 16px; }
.kpi-icon { font-size:24px; flex-shrink:0; }
.kpi-val  { font-size:22px; font-weight:700; color:#fff; line-height:1; }
.kpi-label { font-size:11px; color:rgba(255,255,255,.45); margin:3px 0; }
.kpi-caption { font-size:11px; font-weight:600; color:rgba(255,255,255,.4); }

/* 圖表 */
.chart-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
.chart-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:16px; }
.chart-title { font-size:13px; font-weight:600; color:rgba(255,255,255,.7); margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; }
.chart-legend { display:flex; align-items:center; gap:10px; font-size:11px; color:rgba(255,255,255,.45); }
.dot-sys { width:8px; height:8px; border-radius:50%; background:#FF8C00; display:inline-block; }
.dot-soc { width:8px; height:8px; border-radius:50%; background:#FF6B35; display:inline-block; }
.line-chart { width:100%; height:110px; }
.chart-x-labels { display:flex; justify-content:space-between; font-size:10px; color:rgba(255,255,255,.3); margin-top:6px; }
.bar-chart { display:flex; flex-direction:column; gap:12px; }
.bar-row { display:flex; align-items:center; gap:10px; }
.bar-label { font-size:12px; color:rgba(255,255,255,.6); min-width:72px; white-space:nowrap; }
.bar-track { flex:1; height:8px; background:rgba(255,255,255,.08); border-radius:4px; overflow:hidden; }
.bar-fill { height:100%; border-radius:4px; transition:width .5s; }
.bar-val { font-size:12px; font-weight:600; color:#fff; min-width:36px; text-align:right; }
.fill-yellow { background:linear-gradient(90deg,#F59E0B,#FBBF24); }
.fill-blue   { background:linear-gradient(90deg,#FF8C00,#FFB74D); }
.fill-green  { background:linear-gradient(90deg,#4CAF50,#66BB6A); }
.fill-pink   { background:linear-gradient(90deg,#FF6B35,#FFAB73); }
.fill-purple { background:linear-gradient(90deg,#FF8C00,#FF6B35); }
.fill-teal   { background:linear-gradient(90deg,#FFB300,#FFC107); }
.metric-list { display:flex; flex-direction:column; gap:12px; }
.metric-row { display:flex; align-items:center; gap:12px; }
.metric-label { font-size:12px; color:rgba(255,255,255,.6); min-width:72px; }
.metric-bar-wrap { flex:1; display:flex; align-items:center; gap:8px; }
.metric-bar { flex:1; height:8px; background:rgba(255,255,255,.08); border-radius:4px; overflow:hidden; }
.metric-fill { height:100%; border-radius:4px; transition:width .5s; }
.metric-val { font-size:12px; font-weight:600; color:#fff; min-width:32px; }

/* 資料表 */
.table-toolbar { display:flex; gap:10px; margin-bottom:14px; }
.search-input { flex:1; padding:9px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#FFE0B2; font-size:13px; outline:none; }
.sort-select  { padding:9px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#FFE0B2; font-size:13px; cursor:pointer; outline:none; }
.data-table-wrap { overflow-x:auto; border-radius:14px; }
.data-table { width:100%; border-collapse:collapse; background:rgba(255,255,255,.03); font-size:13px; }
.data-table th { padding:12px 14px; text-align:left; font-size:11px; font-weight:600; color:rgba(255,255,255,.4); border-bottom:1px solid rgba(255,255,255,.08); white-space:nowrap; }
.data-table td { padding:11px 14px; border-bottom:1px solid rgba(255,255,255,.05); color:#FFE0B2; }
.data-table tr:hover td { background:rgba(255,255,255,.04); }
.data-table tr.row-me td { background:rgba(255,140,0,.08); }
.rank-td { font-size:16px; width:40px; }
.name-td { display:flex; align-items:center; gap:8px; font-weight:600; }
.student-av { width:28px; height:28px; border-radius:50%; color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.leader-badge { font-size:9px; background:rgba(245,158,11,.3); color:#FCD34D; padding:1px 5px; border-radius:4px; font-weight:700; }
.late-joiner-badge { font-size:9px; background:rgba(96,165,250,.25); color:#93C5FD; padding:1px 5px; border-radius:4px; font-weight:700; margin-left:4px; cursor:help; }
.withdrawn-badge { font-size:9px; background:rgba(148,163,184,.25); color:#CBD5E1; padding:1px 5px; border-radius:4px; font-weight:700; margin-left:4px; cursor:help; }
.study-start-label { display:flex; align-items:center; gap:6px; font-size:12px; color:#FFE0B2; margin-left:4px; }
.study-start-input { padding:5px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#FFE0B2; font-size:12px; outline:none; }
.num-td { text-align:right; font-weight:600; }
.sys-td { color:#FBBF24; }
.soc-td { color:#FFAB73; }
.acc-great { color:#66BB6A; font-weight:700; }
.acc-ok    { color:#FBBF24; font-weight:700; }
.acc-low   { color:#F87171; font-weight:700; }
.exp-tag { font-size:10px; padding:2px 8px; border-radius:6px; font-weight:700; }
.exp-tag.experimental { background:rgba(255,140,0,.25); color:#FFCC80; }
.exp-tag.control      { background:rgba(166,132,46,.15); color:#A6842E; }

/* 比較組 */
.compare-grid { display:grid; grid-template-columns:1fr auto 1fr; gap:16px; margin-bottom:20px; }
.compare-card { background:rgba(255,255,255,.04); border-radius:16px; padding:18px; border:1px solid rgba(255,255,255,.08); }
.compare-card.experimental { border-color:rgba(255,140,0,.3); }
.compare-card.control { border-color:rgba(166,132,46,.2); }
.cc-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.cc-count { font-size:12px; color:rgba(255,255,255,.4); }
.cc-stats { display:flex; flex-direction:column; gap:10px; }
.cc-stat { display:flex; justify-content:space-between; align-items:center; }
.cc-val { font-size:18px; font-weight:700; color:#fff; }
.cc-val.pink { color:#FFAB73; }
.cc-val.gray { color:rgba(255,255,255,.3); }
.cc-lbl { font-size:11px; color:rgba(255,255,255,.4); }
.compare-vs-col { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; min-width:120px; }
.cv-badge { font-size:14px; font-weight:900; color:#F87171; background:rgba(248,113,113,.1); border:1px solid rgba(248,113,113,.3); border-radius:20px; padding:4px 14px; }
.cv-items { width:100%; display:flex; flex-direction:column; gap:10px; }
.cv-item { display:flex; flex-direction:column; gap:4px; }
.cv-label { font-size:10px; color:rgba(255,255,255,.4); text-align:center; }
.cv-bar-wrap { display:flex; height:8px; border-radius:4px; overflow:hidden; gap:2px; }
.cv-bar-exp  { background:#FF8C00; border-radius:4px; transition:flex .5s; }
.cv-bar-ctrl { background:#A6842E; border-radius:4px; transition:flex .5s; }
.cv-nums { display:flex; justify-content:space-between; font-size:10px; }
.cv-exp  { color:#FFCC80; font-weight:600; }
.cv-ctrl { color:#A6842E; font-weight:600; }
.diff-summary { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:18px; }
.diff-title { font-size:13px; font-weight:600; color:rgba(255,255,255,.7); margin-bottom:14px; }
.diff-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.diff-item { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; }
.diff-item.diff-pos { background:rgba(76,175,80,.1); border:1px solid rgba(76,175,80,.25); }
.diff-item.diff-neg { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); }
.diff-icon { font-size:18px; }
.diff-item.diff-pos .diff-icon { color:#66BB6A; }
.diff-item.diff-neg .diff-icon { color:#F87171; }
.diff-label { font-size:11px; color:rgba(255,255,255,.5); margin-bottom:2px; }
.diff-val   { font-size:14px; font-weight:700; color:#fff; }

/* ══ 組別管理 ══ */
.group-tip { background:rgba(255,140,0,.1); border:1px solid rgba(255,140,0,.25); border-radius:12px; padding:12px 16px; font-size:13px; color:#FFCC80; margin-bottom:16px; }
.new-group-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:16px; margin-bottom:16px; }
.card-sec-title { font-size:13px; font-weight:700; color:rgba(255,255,255,.7); margin-bottom:12px; }
.new-group-row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.action-btn { padding:9px 18px; border-radius:10px; border:none; font-family:'Inter',sans-serif; font-size:13px; font-weight:700; cursor:pointer; transition:all .15s; }
.create-btn { background:linear-gradient(135deg,#FF8C00,#FF6B35); color:#fff; }
.create-btn:hover { opacity:.9; }

.group-cards { display:flex; flex-direction:column; gap:12px; }
.group-manage-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:16px; }
.ungroup-card { background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.2); border-radius:16px; padding:16px; margin-top:12px; }
.gm-header { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
.gm-name { font-size:14px; font-weight:700; color:#fff; }
.gm-count { font-size:12px; color:rgba(255,255,255,.4); margin-left:auto; }
.gm-members { display:flex; flex-direction:column; gap:8px; }
.gm-member-row { display:flex; align-items:center; gap:10px; padding:8px 10px; background:rgba(255,255,255,.03); border-radius:10px; }
.gm-av { width:28px; height:28px; border-radius:50%; color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.gm-nick { font-size:13px; font-weight:600; color:#FFE0B2; flex:1; }
.leader-toggle { padding:4px 10px; border-radius:20px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.05); color:rgba(255,255,255,.5); font-size:11px; font-weight:600; cursor:pointer; transition:all .15s; white-space:nowrap; }
.leader-toggle.is-leader { background:rgba(245,158,11,.2); border-color:rgba(245,158,11,.4); color:#FCD34D; }
.leader-toggle:hover { background:rgba(245,158,11,.15); color:#FCD34D; }

.attendance-toggle { padding:4px 10px; border-radius:20px; border:1px solid rgba(76,175,80,.35); background:rgba(76,175,80,.12); color:#6EE7B7; font-size:11px; font-weight:700; cursor:pointer; transition:all .15s; white-space:nowrap; }
.attendance-toggle.absent { background:rgba(245,158,11,.18); border-color:rgba(245,158,11,.4); color:#FCD34D; }
.attendance-toggle:hover { opacity:.85; }
.group-move-select { padding:4px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#FFE0B2; font-size:12px; cursor:pointer; outline:none; }

/* 儲存提示 Toast */
.save-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#4CAF50; color:#fff; padding:10px 20px; border-radius:20px; font-size:13px; font-weight:700; z-index:999; box-shadow:0 4px 16px rgba(76,175,80,.4); }

/* 學生答題紀錄 Modal */
.modal-backdrop { position:fixed; inset:0; background:rgba(61,43,0,.72); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
.modal-box { background:#3D2B00; border:1px solid rgba(255,255,255,.12); border-radius:16px; max-width:900px; width:100%; max-height:80vh; overflow-y:auto; padding:20px; }
.modal-box-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.modal-box-header h3 { font-size:15px; font-weight:700; color:#fff; margin:0; }
.modal-close-btn { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); color:#FFE0B2; border-radius:8px; width:28px; height:28px; cursor:pointer; font-size:13px; }
.modal-close-btn:hover { background:rgba(255,255,255,.15); }
.transfer-note { font-size:13px; color:#FFE0B2; line-height:1.7; margin:0 0 14px; }
.transfer-actions { display:flex; gap:8px; margin-top:16px; }
</style>
<style scoped>
@media (max-width:767px){.dashboard-page{display:block}.sidebar{width:100%;min-height:auto;position:sticky;top:0;z-index:20}.sidebar-nav{display:flex;overflow-x:auto}.nav-item{min-width:108px;min-height:44px}.main-content{padding:16px}.kpi-grid{grid-template-columns:repeat(2,1fr)}.compare-grid{grid-template-columns:1fr}.compare-vs-col{display:none}.data-table-wrap{overflow-x:auto}.data-table{min-width:640px}}
@media (min-width:768px) and (max-width:1023px){.sidebar{width:200px}.main-content{padding:24px}.kpi-grid{grid-template-columns:repeat(3,1fr)}.dashboard-page{min-width:768px}.action-btn,.nav-item{min-height:44px}}
@media (min-width:1024px){.main-content{padding:32px;max-width:1440px}.kpi-grid{grid-template-columns:repeat(6,1fr)}.compare-grid{grid-template-columns:1fr auto 1fr}.action-btn,.nav-item{min-height:44px}}
</style>
