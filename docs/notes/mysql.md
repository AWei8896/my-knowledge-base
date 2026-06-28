# MySQL 笔记

## 一、数据库与表操作

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS db_name DEFAULT CHARSET utf8mb4;

-- 删除数据库
DROP DATABASE IF EXISTS db_name;

-- 创建表
CREATE TABLE student (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    age INT DEFAULT 18,
    gender ENUM('男', '女'),
    score DECIMAL(5,2),
    class_id INT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 查看表结构
DESC student;

-- 删除表
DROP TABLE IF EXISTS student;

-- 修改表
ALTER TABLE student ADD COLUMN email VARCHAR(100);
ALTER TABLE student MODIFY COLUMN age TINYINT;
ALTER TABLE student DROP COLUMN email;
ALTER TABLE student RENAME TO stu;
```

---

## 二、CRUD 增删改查

### INSERT — 插入数据

```sql
-- 单行插入
INSERT INTO student (name, age, gender, score, class_id)
VALUES ('张三', 20, '男', 88.5, 1);

-- 多行插入
INSERT INTO student (name, age, gender, score, class_id) VALUES
('李四', 21, '女', 92.0, 1),
('王五', 22, '男', 76.5, 2),
('赵六', 20, '女', 85.0, 2);

-- 从查询结果插入
INSERT INTO student_backup SELECT * FROM student WHERE score >= 80;
```

### SELECT — 查询数据

```sql
-- 基础查询
SELECT * FROM student;
SELECT name, score FROM student;

-- 条件查询
SELECT * FROM student WHERE score >= 80 AND gender = '女';
SELECT * FROM student WHERE age BETWEEN 20 AND 25;
SELECT * FROM student WHERE name LIKE '张%';
SELECT * FROM student WHERE class_id IN (1, 2, 3);
SELECT * FROM student WHERE email IS NULL;

-- 去重
SELECT DISTINCT gender FROM student;

-- 排序
SELECT * FROM student ORDER BY score DESC, age ASC;

-- 分页 (LIMIT 偏移量, 条数)
SELECT * FROM student LIMIT 0, 10;   -- 第1页
SELECT * FROM student LIMIT 10, 10;  -- 第2页

-- 聚合函数
SELECT COUNT(*) FROM student;
SELECT AVG(score), MAX(score), MIN(score), SUM(score) FROM student;

-- 分组 & 过滤分组 (WHERE 先过滤 → GROUP BY → HAVING 后过滤)
SELECT class_id, AVG(score) AS avg_score
FROM student
WHERE age >= 18
GROUP BY class_id
HAVING avg_score >= 80
ORDER BY avg_score DESC;
```

### UPDATE — 更新数据

```sql
-- 更新单列
UPDATE student SET score = 90 WHERE id = 1;

-- 更新多列
UPDATE student SET age = 21, score = score + 5 WHERE class_id = 1;

-- 关联更新
UPDATE student s
JOIN class c ON s.class_id = c.id
SET s.score = s.score + 10
WHERE c.name = '重点班';
```

### DELETE — 删除数据

```sql
-- 条件删除
DELETE FROM student WHERE id = 5;

-- 清空表（重置自增，比 DELETE 快）
TRUNCATE TABLE student;

-- 关联删除
DELETE s FROM student s
JOIN class c ON s.class_id = c.id
WHERE c.name = '毕业班';
```

---

## 三、多表联查

示例表结构：

```
student: id, name, age, score, class_id
class:   id, name, teacher
course:  id, name, credit
sc:      student_id, course_id, score
```

### JOIN 类型速查

```sql
-- INNER JOIN：两表都匹配才返回
SELECT s.name, c.name AS class_name
FROM student s
INNER JOIN class c ON s.class_id = c.id;

-- LEFT JOIN：左表全部保留，右表无匹配填 NULL
SELECT s.name, c.name AS class_name
FROM student s
LEFT JOIN class c ON s.class_id = c.id;

-- RIGHT JOIN：右表全部保留
SELECT s.name, c.name AS class_name
FROM student s
RIGHT JOIN class c ON s.class_id = c.id;

-- FULL JOIN（MySQL 不支持 FULL JOIN，用 UNION 模拟）
SELECT s.name, c.name FROM student s LEFT JOIN class c ON s.class_id = c.id
UNION
SELECT s.name, c.name FROM student s RIGHT JOIN class c ON s.class_id = c.id;

-- CROSS JOIN：笛卡尔积
SELECT s.name, c.name FROM student s CROSS JOIN class c;
```

### 三表联查

```sql
-- 学生 → 选课 → 课程
SELECT s.name AS 学生, c.name AS 课程, sc.score AS 成绩
FROM student s
JOIN sc ON s.id = sc.student_id
JOIN course c ON sc.course_id = c.id
WHERE sc.score >= 80
ORDER BY sc.score DESC;
```

### 自连接

```sql
-- 查询同班同学
SELECT s1.name AS 学生A, s2.name AS 学生B, s1.class_id
FROM student s1
JOIN student s2 ON s1.class_id = s2.class_id AND s1.id < s2.id;
```

### 子查询

```sql
-- WHERE 子查询：查高于平均分的学生
SELECT name, score FROM student
WHERE score > (SELECT AVG(score) FROM student);

-- FROM 子查询：子查询作为临时表
SELECT t.class_id, t.avg_score
FROM (SELECT class_id, AVG(score) AS avg_score FROM student GROUP BY class_id) t
WHERE t.avg_score >= 80;

-- SELECT 子查询
SELECT name, score,
       (SELECT AVG(score) FROM student) AS avg_all
FROM student;

-- EXISTS 子查询
SELECT name FROM student s
WHERE EXISTS (SELECT 1 FROM sc WHERE sc.student_id = s.id AND sc.score >= 90);

-- IN 子查询
SELECT name FROM student
WHERE id IN (SELECT student_id FROM sc WHERE course_id = 1);
```

### UNION 与 UNION ALL

```sql
-- UNION：去重合并
SELECT name FROM student WHERE score >= 90
UNION
SELECT name FROM student WHERE class_id = 1;

-- UNION ALL：不去重，更快
SELECT name FROM student WHERE score >= 90
UNION ALL
SELECT name FROM student WHERE class_id = 1;
```

---

## 四、窗口函数

> 窗口函数 = 函数 + OVER(PARTITION BY 分组 ORDER BY 排序)

### 排名函数

```sql
-- ROW_NUMBER()：连续不重复排名 (1,2,3,4...)
SELECT name, score,
       ROW_NUMBER() OVER (ORDER BY score DESC) AS rn
FROM student;

-- RANK()：跳跃排名 (1,1,3,4...)
SELECT name, score,
       RANK() OVER (ORDER BY score DESC) AS rnk
FROM student;

-- DENSE_RANK()：连续排名 (1,1,2,3...)
SELECT name, score,
       DENSE_RANK() OVER (ORDER BY score DESC) AS dr
FROM student;

-- 分组排名：每个班级内部排名
SELECT name, class_id, score,
       ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY score DESC) AS class_rank
FROM student;

-- NTILE(N)：分成 N 组
SELECT name, score,
       NTILE(4) OVER (ORDER BY score DESC) AS quartile
FROM student;
```

### 聚合窗口函数

```sql
-- 累计求和
SELECT name, score,
       SUM(score) OVER (ORDER BY id) AS running_total
FROM student;

-- 分组累计求和
SELECT name, class_id, score,
       SUM(score) OVER (PARTITION BY class_id ORDER BY id) AS class_running_total
FROM student;

-- 移动平均（前后各一行）
SELECT name, score,
       AVG(score) OVER (ORDER BY id ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS moving_avg
FROM student;

-- 分组内的 MAX / MIN / AVG / COUNT
SELECT name, class_id, score,
       MAX(score) OVER (PARTITION BY class_id) AS class_max,
       AVG(score) OVER (PARTITION BY class_id) AS class_avg,
       COUNT(*) OVER (PARTITION BY class_id) AS class_count
FROM student;
```

### 偏移函数

```sql
-- LAG：取前一行
SELECT name, score,
       LAG(score, 1, 0) OVER (ORDER BY id) AS prev_score
FROM student;

-- LEAD：取后一行
SELECT name, score,
       LEAD(score, 1, 0) OVER (ORDER BY id) AS next_score
FROM student;

-- FIRST_VALUE / LAST_VALUE：窗口内首尾值
SELECT name, class_id, score,
       FIRST_VALUE(score) OVER (PARTITION BY class_id ORDER BY score DESC) AS best_in_class
FROM student;
```

### 窗口函数典型场景

```sql
-- TopN：每班前3名
SELECT * FROM (
    SELECT name, class_id, score,
           ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY score DESC) AS rn
    FROM student
) t WHERE rn <= 3;

-- 去重保留最新（按时间排序取第一条）
SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY create_time DESC) AS rn
    FROM orders
) t WHERE rn = 1;

-- 环比增长（本期 vs 上期）
SELECT name, score,
       LAG(score) OVER (ORDER BY id) AS prev,
       ROUND((score - LAG(score) OVER (ORDER BY id)) / LAG(score) OVER (ORDER BY id) * 100, 2) AS change_pct
FROM student;

-- 累计占比
SELECT name, score,
       SUM(score) OVER () AS total,
       ROUND(score / SUM(score) OVER () * 100, 2) AS pct
FROM student;
```

---

## 五、常用函数速查

### 字符串函数

| 函数 | 示例 | 结果 |
|------|------|------|
| `CONCAT(a, b)` | `CONCAT('Hello','World')` | `HelloWorld` |
| `SUBSTRING(s, start, len)` | `SUBSTRING('MySQL', 3, 2)` | `SQ` |
| `LENGTH(s)` | `LENGTH('中文')` | 字节长度 |
| `CHAR_LENGTH(s)` | `CHAR_LENGTH('中文')` | 字符数 |
| `REPLACE(s, a, b)` | `REPLACE('abc','b','x')` | `axc` |
| `UPPER(s)` / `LOWER(s)` | `UPPER('abc')` | `ABC` |
| `TRIM(s)` | `TRIM(' a ')` | `a` |
| `GROUP_CONCAT(col)` | 分组拼接 | `'张三,李四,王五'` |

### 日期函数

```sql
SELECT NOW();                          -- 当前日期时间
SELECT CURDATE();                      -- 当前日期
SELECT DATE_FORMAT(NOW(), '%Y-%m-%d'); -- 格式化
SELECT DATE_ADD(NOW(), INTERVAL 7 DAY);-- 加7天
SELECT DATEDIFF('2025-12-31', NOW());  -- 日期差
```

### CASE WHEN

```sql
SELECT name, score,
       CASE
           WHEN score >= 90 THEN '优秀'
           WHEN score >= 80 THEN '良好'
           WHEN score >= 60 THEN '及格'
           ELSE '不及格'
       END AS grade
FROM student;
```

---

## 六、索引

```sql
-- 普通索引
CREATE INDEX idx_name ON student(name);

-- 联合索引（最左前缀原则）
CREATE INDEX idx_class_score ON student(class_id, score);

-- 唯一索引
CREATE UNIQUE INDEX idx_email ON student(email);

-- 查看索引
SHOW INDEX FROM student;

-- 删除索引
DROP INDEX idx_name ON student;

-- 查看执行计划
EXPLAIN SELECT * FROM student WHERE name = '张三';
```

---

## 七、事务

```sql
START TRANSACTION;
    UPDATE account SET balance = balance - 100 WHERE id = 1;
    UPDATE account SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- 或 ROLLBACK;

-- 设置隔离级别
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

---

## 八、视图

```sql
CREATE VIEW v_top_student AS
SELECT s.name, s.score, c.name AS class_name
FROM student s JOIN class c ON s.class_id = c.id
WHERE s.score >= 80;

SELECT * FROM v_top_student;
DROP VIEW IF EXISTS v_top_student;
```

---
*最后更新: 2025-06-23*
