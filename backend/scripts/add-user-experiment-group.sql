-- 讓教師可以「覆寫」個別學生的實驗組/對照組身份
-- NULL = 沿用所屬班級（classes.experiment_group）的預設值
-- 非 NULL = 個別覆寫，不受班級設定影響
ALTER TABLE users
  ADD COLUMN experiment_group ENUM('experimental','control') NULL DEFAULT NULL
  AFTER class_id;
