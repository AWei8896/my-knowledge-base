# Hive 笔记

## 一、概述

### 什么是 Hive

Hive 是建立在 Hadoop 之上的**数据仓库工具**，由 Facebook 开源。它将 SQL 语句翻译为 MapReduce/Tez/Spark 任务在 Hadoop 上执行。让不会写 Java MapReduce 的分析师也能用熟悉的 SQL 处理 PB 级数据。

**一句话：Hive = SQL on Hadoop，让大数据查询像写 SQL 一样简单。**

### 核心定位

| 问题 | 答案 |
|------|------|
| **解决什么问题** | 大数据如何用 SQL 查询（不用写 MR 代码） |
| **适用场景** | 离线批处理、ETL、数据仓库、报表统计 |
| **不适用场景** | 实时查询（延迟高，用 HBase/ClickHouse）；Hive 3.x+ 已支持 ACID 事务表，可实现 UPDATE/DELETE/MERGE，但非 OLTP 级别 |
| **本质** | 把 HQL → 翻译成 MapReduce/Tez/Spark → 在 YARN 上执行 → 读写 HDFS |

---

## 二、架构

```
┌──────────────────────────────────────────┐
│                  Client                  │  JDBC / Thrift / CLI
└──────────────────┬───────────────────────┘
                   │
┌──────────────────▼────────────────────────┐
│              HiveServer2                  │  接收 SQL、编译、优化、提交执行
│  ┌─────────┐ ┌────────┐ ┌──────────────┐  │
│  │ Parser  │→│ Planner│→│  Executor    │  │
│  │ 语法解析  │ │逻辑计划 │ │ 提交 MR/Tez│  │
│  └─────────┘ └────────┘ └──────────────┘  │
└──────────────────┬────────────────────────┘
                   │ 读写元数据
┌──────────────────▼───────────────────────┐
│              Metastore                   │  存表结构/列类型/分区信息/数据路径
│         (通常 MySQL/PostgreSQL)          │
└──────────────────────────────────────────┘
                   │ 实际数据读写
┌──────────────────▼──────────────────────┐
│          Hadoop 集群                    │
│  ┌──────┐  ┌────────┐  ┌──────┐         │
│  │ HDFS │  │  YARN  │  │ MR/T │         │
│  │ 存储 │  │ 资源调度│  │ 执行 │         │
│  └──────┘  └────────┘  └──────┘         │
└─────────────────────────────────────────┘
```

### 核心组件

| 组件 | 职责 |
|------|------|
| **HiveServer2** | 服务端，接收客户端 JDBC/Thrift 连接，解析 SQL，提交执行 |
| **Metastore** | 元数据存储（表名、列、分区、HDFS 路径等），通常存在 MySQL 中 |
| **Driver** | SQL 编译优化：解析 → 语义分析 → 逻辑计划 → 物理计划 → 提交 Job |
| **执行引擎** | 默认 MR，可切换为 Tez（更快）或 Spark（内存计算） |

---

## 三、数据类型

| 类型 | 示例 |
|------|------|
| **TINYINT** | 1 字节整数，-128~127 |
| **INT** | 4 字节整数 |
| **BIGINT** | 8 字节整数 |
| **FLOAT / DOUBLE** | 浮点数 |
| **DECIMAL(p,s)** | 定点小数，`DECIMAL(10,2)` |
| **STRING** | 字符串（最常用） |
| **VARCHAR(n)** | 变长字符串 |
| **TIMESTAMP** | 时间戳 |
| **DATE** | 日期 |
| **BOOLEAN** | 布尔值 |

**复杂类型：**

| 类型 | 说明 | 示例 |
|------|------|------|
| **ARRAY\<T\>** | 数组 | `["a","b","c"]` |
| **MAP\<K,V\>** | 键值对 | `{"name":"张三","age":20}` |
| **STRUCT** | 结构体 | `STRUCT<name:STRING, age:INT>` |

---

## 四、表类型

### 内部表（Managed Table）

Hive 完全管理表的生命周期。删除表时，元数据 **和** HDFS 上的数据一起删除。

```sql
CREATE TABLE emp (
    id      INT,
    name    STRING,
    salary  DECIMAL(10,2)
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','                    -- 列分隔符
STORED AS TEXTFILE;                         -- 存储格式

-- 删除表 → 元数据 + 数据文件一起删除
DROP TABLE emp;
```

### 外部表（External Table）

Hive 只管理元数据，不管理数据文件。删除表时只删元数据，HDFS 上的数据保留。

```sql
CREATE EXTERNAL TABLE emp_ext (
    id      INT,
    name    STRING,
    salary  DECIMAL(10,2)
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
LOCATION '/user/hive/warehouse/emp_data/';   -- 指向已有数据目录

-- 删除表 → 只删元数据，数据文件还在 HDFS
DROP TABLE emp_ext;
```

### 选择建议

| 场景 | 用哪种 |
|------|--------|
| 数据只被 Hive 使用，删表后数据不需要 | 内部表 |
| 数据被多个工具共享（Spark/Hive/Presto 共用） | 外部表 |
| 数据由外部产生，Hive 只是查询 | 外部表 |
| 生产环境（防止误删数据） | 推荐外部表 |

### 分区表

按某个字段将数据分目录存储，查询时只扫描相关分区，大幅减少数据扫描量。

```sql
CREATE TABLE emp_part (
    id      INT,
    name    STRING,
    salary  DECIMAL(10,2)
)
PARTITIONED BY (dt STRING, hour STRING)     -- 分区字段（不在数据文件中）
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ',';

-- HDFS 存储结构：
-- /user/hive/warehouse/emp_part/dt=2025-06-01/hour=08/data.txt
-- /user/hive/warehouse/emp_part/dt=2025-06-01/hour=09/data.txt
-- /user/hive/warehouse/emp_part/dt=2025-06-02/hour=08/data.txt
```

**加载分区数据：**

```sql
-- 静态分区（手动指定分区值）
LOAD DATA LOCAL INPATH '/data/emp_20250601.txt'
INTO TABLE emp_part PARTITION (dt='2025-06-01', hour='08');

-- 动态分区（从数据中自动提取分区值）
SET hive.exec.dynamic.partition=true;
SET hive.exec.dynamic.partition.mode=nonstrict;

INSERT INTO TABLE emp_part PARTITION (dt)
SELECT id, name, salary, dt FROM emp_source;
```

> 分区不宜过多（建议 ≤ 几万个），否则 NameNode 元数据压力大。

### 分桶表

将数据按某列的 hash 值分成固定数量的桶，用于**数据采样**和**高效 JOIN**（两个表按相同列分桶，JOIN 时不用全量 shuffle）。

```sql
CREATE TABLE emp_bucket (
    id      INT,
    name    STRING,
    salary  DECIMAL(10,2)
)
CLUSTERED BY (id) INTO 8 BUCKETS;           -- 按 id hash 分 8 个桶

-- 分桶 JOIN（两表分桶数相同或成倍数，可避免 shuffle）
SELECT a.*, b.*
FROM emp_bucket a
JOIN dept_bucket b ON a.dept_id = b.id;
```

---

## 五、加载数据

```sql
-- 从本地文件加载
LOAD DATA LOCAL INPATH '/home/user/data.csv'
INTO TABLE emp;

-- 从 HDFS 加载（文件会被移动到表目录）
LOAD DATA INPATH '/user/data/data.csv'
INTO TABLE emp;

-- 从本地文件加载到分区
LOAD DATA LOCAL INPATH '/home/user/data.csv'
INTO TABLE emp_part PARTITION (dt='2025-06-01');

-- INSERT 插入（会生成 MR 任务，一次一条慢，适合批量）
INSERT INTO TABLE emp VALUES (1, '张三', 5000.00);

-- INSERT OVERWRITE 覆盖写入（覆盖整个表或指定分区）
INSERT OVERWRITE TABLE emp_part PARTITION (dt='2025-06-01')
SELECT id, name, salary FROM emp_temp WHERE dt='2025-06-01';

-- CTAS：从查询结果建表
CREATE TABLE emp_backup AS SELECT * FROM emp WHERE salary > 5000;
```

---

## 六、CRUD 完整操作（Hive 3.x+ 事务表）

Hive 的 CRUD 能力经历了三个阶段：

| 阶段 | 能力 |
|------|------|
| Hive 1.x | 只能 INSERT 追加，不支持 UPDATE/DELETE |
| Hive 2.x | 实验性支持事务表 |
| Hive 3.x+ | **完整 ACID 支持**：INSERT / UPDATE / DELETE / MERGE |

### 前置条件

只有 **ACID 事务表** 才支持 UPDATE/DELETE。建表要求：

```sql
-- 必须满足：ORC 格式 + 分桶 + 事务属性
CREATE TABLE emp_acid (
    id      INT,
    name    STRING,
    salary  DECIMAL(10,2)
)
CLUSTERED BY (id) INTO 8 BUCKETS          -- 必须分桶
STORED AS ORC                              -- 必须 ORC 格式
TBLPROPERTIES (
    'transactional' = 'true',              -- 开启事务
    'transactional_properties' = 'insert_only'  -- 'insert_only' 或 'full_acid'
);
```

### 增（INSERT）

```sql
-- 单行插入（会产生 MR 任务，不适合大量单条插入）
INSERT INTO emp_acid VALUES (1, '张三', 5000.00);
INSERT INTO emp_acid VALUES
(2, '李四', 6000.00),
(3, '王五', 7000.00);

-- 批量插入（推荐方式）
INSERT INTO emp_acid
SELECT id, name, salary FROM emp_temp WHERE dt = '2025-06-01';

-- 覆盖写入（替换整个表或指定分区）
INSERT OVERWRITE TABLE emp_acid
SELECT * FROM emp_temp WHERE dt = '2025-06-01';

-- 动态分区插入
INSERT INTO TABLE emp_part PARTITION (dt)
SELECT id, name, salary, dt FROM emp_source;

-- MERGE（增改合一），Hive 4.0 支持更完善
MERGE INTO emp_acid AS target
USING emp_update AS source
ON target.id = source.id
WHEN MATCHED THEN
    UPDATE SET name = source.name, salary = source.salary
WHEN NOT MATCHED THEN
    INSERT VALUES (source.id, source.name, source.salary);
```

### 删（DELETE）

```sql
-- 条件删除
DELETE FROM emp_acid WHERE id = 10;
DELETE FROM emp_acid WHERE dt = '2025-05-01' AND salary < 3000;

-- TRUNCATE（清空表，保留表结构）
TRUNCATE TABLE emp_acid;
```

### 改（UPDATE）

```sql
-- 修改单列
UPDATE emp_acid SET salary = 6000 WHERE id = 1;

-- 修改多列
UPDATE emp_acid
SET name = '张三丰', salary = salary + 1000
WHERE id = 1;

-- 按关联表更新
UPDATE emp_acid
SET salary = salary * 1.1
WHERE dept_id IN (SELECT id FROM dept WHERE dept_name = '研发部');
```

### 查（SELECT）

```sql
-- 快照查询（默认，查询最新已提交数据）
SELECT * FROM emp_acid WHERE id = 1;

-- 按时间点查询历史数据（Hive 3.x 支持）
SELECT * FROM emp_acid
FOR SYSTEM_TIME AS OF '2025-06-01 12:00:00'
WHERE id = 1;

-- 查看表的事务历史
SHOW COMPACTIONS;
SHOW TRANSACTIONS;
```

### CRUD 完整示例

```sql
-- 1. 创建事务表
CREATE TABLE orders_acid (
    order_id    BIGINT,
    user_id     BIGINT,
    amount      DECIMAL(10,2),
    status      STRING,
    update_time TIMESTAMP
)
CLUSTERED BY (order_id) INTO 16 BUCKETS
STORED AS ORC
TBLPROPERTIES ('transactional'='true');

-- 2. 插入
INSERT INTO orders_acid VALUES (1001, 10001, 99.90, '已支付', CURRENT_TIMESTAMP);

-- 3. 修改
UPDATE orders_acid SET status = '已发货', update_time = CURRENT_TIMESTAMP WHERE order_id = 1001;

-- 4. 删除
DELETE FROM orders_acid WHERE order_id = 1001;
```

### 事务表的限制

| 限制 | 说明 |
|------|------|
| 必须是 ORC 格式 | 不支持 TEXTFILE、Parquet |
| 必须分桶 | 不指定则自动分桶 |
| 不支持 LOAD DATA | 只能用 INSERT 写入 |
| 每次 DML 生成增量文件 | 后台 Compactor 自动合并，需配置 |
| 不支持 BEGIN/COMMIT/ROLLBACK | 每条 DML 语句自动提交，不可手动控制事务边界 |

> Hive 的事务表是为**批量 ETL 中需要增删改的场景**设计的，不是用来替代 MySQL 做高频在线交易的。大量单行 UPDATE/DELETE 性能不佳，推荐批量操作。

---

## 七、查询语法

Hive SQL（HQL）与 MySQL 高度相似，但有自身特点：

```sql
-- 基础查询
SELECT name, salary
FROM emp
WHERE salary > 5000
ORDER BY salary DESC
LIMIT 100;

-- CASE WHEN
SELECT name,
       CASE
           WHEN salary >= 10000 THEN '高薪'
           WHEN salary >= 5000  THEN '中等'
           ELSE '普通'
       END AS level
FROM emp;

-- 分组聚合
SELECT dept_id, AVG(salary), COUNT(*)
FROM emp
GROUP BY dept_id
HAVING AVG(salary) > 5000;

-- JOIN（支持 INNER / LEFT / RIGHT / FULL / CROSS / LEFT SEMI）
SELECT e.name, d.dept_name
FROM emp e
LEFT JOIN dept d ON e.dept_id = d.id;

-- LEFT SEMI JOIN：等价于 IN 子查询，但更高效
SELECT e.* FROM emp e
LEFT SEMI JOIN dept d ON e.dept_id = d.id;

-- UNION ALL
SELECT id, name FROM emp WHERE dt='2025-06-01'
UNION ALL
SELECT id, name FROM emp WHERE dt='2025-06-02';

-- 子查询（FROM 中的子查询必须有别名）
SELECT t.name, t.avg_sal
FROM (SELECT name, AVG(salary) AS avg_sal FROM emp GROUP BY name) t
WHERE t.avg_sal > 5000;
```

---

## 八、常用内置函数

```sql
-- 字符串
CONCAT('a', 'b', 'c')               -- 'abc'
CONCAT_WS('-', '2025', '06', '01')  -- '2025-06-01'
SUBSTRING('hello', 1, 3)            -- 'hel'
SPLIT('a,b,c', ',')                 -- ["a","b","c"]
TRIM(' hello ')
REGEXP_REPLACE('a1b2', '\\d', '')   -- 'ab'
INSTR('hello', 'e')                 -- 2（位置）

-- 日期
CURRENT_DATE                        -- 当前日期
CURRENT_TIMESTAMP                   -- 当前时间戳
DATE_ADD('2025-06-01', 7)           -- '2025-06-08'
DATE_SUB('2025-06-01', 1)           -- '2025-05-31'
DATEDIFF('2025-06-08', '2025-06-01')-- 7
YEAR('2025-06-01')                  -- 2025
MONTH('2025-06-01')                 -- 6
DATE_FORMAT('2025-06-01', 'yyyyMMdd') -- '20250601'
UNIX_TIMESTAMP('2025-06-01 12:00:00') -- Unix 时间戳
FROM_UNIXTIME(1717200000, 'yyyy-MM-dd HH:mm:ss')

-- 聚合
COUNT / SUM / AVG / MAX / MIN
COUNT(DISTINCT col)
COLLECT_LIST(col)                   -- 收集为数组（不去重）
COLLECT_SET(col)                    -- 收集为数组（去重）

-- 条件
IF(salary > 5000, 'high', 'low')
COALESCE(col1, col2, 'default')     -- 第一个非空值
NVL(col, 0)                         -- null 替换为 0

-- 窗口函数
ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC)
RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)
DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)
LAG(salary, 1) OVER (PARTITION BY dept_id ORDER BY hire_date)
LEAD(salary, 1) OVER (PARTITION BY dept_id ORDER BY hire_date)
SUM(salary) OVER (PARTITION BY dept_id ORDER BY hire_date)  -- 累计

-- 炸裂函数
-- explode：数组 → 多行
SELECT explode(ARRAY('a','b','c'));   -- 3 行

-- LATERAL VIEW explode：一边炸裂一边保留其他列
SELECT name, hobby
FROM emp
LATERAL VIEW explode(SPLIT(hobbies, ',')) t AS hobby;

-- JSON 解析
GET_JSON_OBJECT('{"name":"张三","age":20}', '$.name')   -- '张三'
JSON_TUPLE(json_str, 'name', 'age')                     -- 多字段一次提取
```

---

## 九、窗口函数（Hive 版）

```sql
-- 排名
SELECT name, dept_id, salary,
       ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn,
       RANK()       OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rk,
       DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dr
FROM emp;

-- TopN：每个部门薪资前 3 名
SELECT * FROM (
    SELECT name, dept_id, salary,
           ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn
    FROM emp
) t WHERE rn <= 3;

-- 累计与移动
SELECT name, salary, hire_date,
       SUM(salary) OVER (ORDER BY hire_date) AS running_total,
       AVG(salary) OVER (ORDER BY hire_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg3
FROM emp;

-- 环比
SELECT name, salary, hire_date,
       LAG(salary) OVER (ORDER BY hire_date) AS prev_salary,
       ROUND((salary - LAG(salary) OVER (ORDER BY hire_date)) / LAG(salary) OVER (ORDER BY hire_date) * 100, 2) AS change_pct
FROM emp;
```

---

## 十、文件格式与压缩

| 格式 | 特点 | 适用场景 |
|------|------|----------|
| **TEXTFILE** | 纯文本，可读性强，不压缩 | 测试、小数据 |
| **SEQUENCEFILE** | 二进制键值对，支持块压缩 | MR 中间结果 |
| **ORC** | 列式存储，高压缩比，支持索引、谓词下推 | **生产推荐** |
| **Parquet** | 列式存储，高压缩比，生态兼容性好（Spark 默认） | **生产推荐** |

```sql
-- 创建 ORC 表并开启压缩
CREATE TABLE emp_orc (
    id      INT,
    name    STRING,
    salary  DECIMAL(10,2)
)
STORED AS ORC
TBLPROPERTIES (
    'orc.compress' = 'SNAPPY',                 -- Snappy 压缩（速度快）
    'orc.compress' = 'ZLIB'                    -- ZLIB（压缩比更高）
);

-- 创建 Parquet 表
CREATE TABLE emp_parquet (
    id      INT,
    name    STRING
)
STORED AS PARQUET
TBLPROPERTIES ('parquet.compression'='SNAPPY');
```

---

## 十一、优化手段

### 查询优化

```sql
-- 开启分区裁剪（只扫相关分区，默认开启）
SET hive.optimize.ppd=true;

-- 开启 Map 端 JOIN（小表放内存，不走 Reduce）
SET hive.auto.convert.join=true;
SET hive.mapjoin.smalltable.filesize=25000000;   -- 小表 < 25MB 自动 MapJoin

-- 开启并行执行（互不依赖的阶段并行跑）
SET hive.exec.parallel=true;
SET hive.exec.parallel.thread.number=8;

-- 开启向量化执行（一批一批处理，非一行一行）
SET hive.vectorized.execution.enabled=true;

-- 开启 CBO（基于成本的优化器）
SET hive.cbo.enable=true;

-- 限制倾斜 JOIN 时的处理
SET hive.optimize.skewjoin=true;
SET hive.skewjoin.key=100000;                    -- 超过 10 万行的 key 视为倾斜

-- 动态调整 Reduce 数
SET hive.exec.reducers.bytes.per.reducer=256000000;   -- 每 256MB 数据一个 Reduce
SET hive.exec.reducers.max=1009;                       -- Reduce 最大个数
```

### 常见优化技巧

| 优化点 | 做法 |
|--------|------|
| **分区裁剪** | WHERE 条件带分区字段，只扫需要的分区 |
| **列裁剪** | SELECT 只选需要的列，不用 `SELECT *` |
| **小表放前** | JOIN 时小表（或子查询结果小的）放左边 |
| **Map Join** | 小表 < 25MB 自动放内存，避免 shuffle |
| **避免笛卡尔积** | JOIN 务必写 ON 条件 |
| **ORC/Parquet** | 列存 + 压缩 + 谓词下推，比 TEXTFILE 快几倍 |
| **分桶 JOIN** | 两表按相同列分桶，JOIN 时免 shuffle |
| **避免 DISTINCT + COUNT** | 大数据量用 `GROUP BY` 代替 `COUNT(DISTINCT)` |
| **尽早过滤** | WHERE 条件能提前就提前，减少 JOIN 时的数据量 |
| **合理分区数** | 分区不是越多越好，单个分区数据量 > 1GB，分区总数 < 几万 |

---

## 十二、Hive vs 传统数据库

| 维度 | Hive | MySQL / Oracle |
|------|------|:---:|
| **数据规模** | PB 级 | TB 级 |
| **数据存储** | HDFS 文件 | 数据库文件 |
| **计算引擎** | MR / Tez / Spark | 数据库自身 |
| **延迟** | 高（秒~分钟级） | 低（毫秒级） |
| **事务** | 弱（3.x 支持 ACID，非强项） | 强事务支持 |
| **索引** | 简单（ORC 自带索引） | 丰富（B-Tree、Hash 等） |
| **SQL 兼容** | HQL，与标准 SQL 大部分兼容 | 标准 SQL + 各自扩展 |
| **适用** | 离线批处理、ETL、报表 | 在线交易（OLTP） |
| **价格** | 开源免费 | 商业版昂贵 |

---

## 十三、常用命令

```bash
# 启动 Hive CLI
hive

# 使用 beeline 连接 HiveServer2（推荐）
beeline -u jdbc:hive2://localhost:10000 -n username

# 从文件执行 SQL
hive -f script.sql

# 执行单条 SQL
hive -e "SELECT * FROM emp LIMIT 10"

# 查看表结构
hive -e "DESC FORMATTED table_name"

# 查看分区
hive -e "SHOW PARTITIONS table_name"

# 查看建表语句
hive -e "SHOW CREATE TABLE table_name"
```

### Hive 中运行 Spark 引擎

```sql
SET hive.execution.engine=spark;
SET spark.executor.memory=4g;
SET spark.executor.cores=2;
-- 之后的 SQL 都用 Spark 执行，比 MR 快 10~100 倍
```

---
*最后更新: 2025-06-23*
