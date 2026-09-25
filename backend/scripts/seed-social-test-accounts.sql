-- 社群獎章多人測試 - 測試帳號建立
-- class_id=1（TEST01，五年甲班，experiment_group='experimental'）
-- group_id=1（A 組）、group_id=2（B 組）已存在於 groups 表，直接沿用
-- 密碼統一為 test1234，hash 用 bcrypt cost=12 產生（跟 backend/routes/auth.js 的 register 邏輯一致）

INSERT INTO users (student_id, nickname, password_hash, role, class_id, group_id, is_leader)
VALUES
  ('student001', '測試生001(組長)', '$2b$12$67vuFHszNX.dD951pt8MEuZ1tfrx19hYM3ryxuJTo79TQNUqN47Ce', 'student', 1, 1, 1),
  ('student002', '測試生002',       '$2b$12$67vuFHszNX.dD951pt8MEuZ1tfrx19hYM3ryxuJTo79TQNUqN47Ce', 'student', 1, 1, 0),
  ('student003', '測試生003',       '$2b$12$67vuFHszNX.dD951pt8MEuZ1tfrx19hYM3ryxuJTo79TQNUqN47Ce', 'student', 1, 1, 0),
  ('student004', '測試生004(組長)', '$2b$12$67vuFHszNX.dD951pt8MEuZ1tfrx19hYM3ryxuJTo79TQNUqN47Ce', 'student', 1, 2, 1),
  ('student005', '測試生005',       '$2b$12$67vuFHszNX.dD951pt8MEuZ1tfrx19hYM3ryxuJTo79TQNUqN47Ce', 'student', 1, 2, 0),
  ('student006', '測試生006',       '$2b$12$67vuFHszNX.dD951pt8MEuZ1tfrx19hYM3ryxuJTo79TQNUqN47Ce', 'student', 1, 2, 0);
