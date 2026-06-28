# PySpark 笔记

## 一、SparkSession 初始化

```python
from pyspark.sql import SparkSession

# ============================================================
# 集群模式
# ============================================================
spark = SparkSession.builder \
    .appName("MyApp") \                         # 应用名称，会显示在 Spark UI 上
    .config("spark.sql.shuffle.partitions", 200) \  # shuffle 分区数，默认200，大数据量可调大
    .config("spark.executor.memory", "4g") \    # 每个 Executor 内存，根据集群资源和数据量设定
    .config("spark.executor.cores", 2) \        # 每个 Executor 核数
    .config("spark.driver.memory", "2g") \      # Driver 内存，collect 大量数据时需调大
    .config("spark.sql.adaptive.enabled", True) \   # 开启自适应查询优化（AQE），Spark 3.0+推荐
    .config("spark.sql.adaptive.coalescePartitions.enabled", True) \  # 动态合并小分区
    .getOrCreate()                               # 获取或创建 SparkSession（单例）

# ============================================================
# 本地调试模式
# ============================================================
spark = SparkSession.builder \
    .master("local[*]") \                       # 本地模式，[*] 表示使用所有可用CPU核
    .master("local[4]") \                       # 也可指定固定核数
    .appName("local_test") \                    # 本地调试时的应用名
    .config("spark.driver.memory", "4g") \      # 本地调试时 Driver 内存建议给大一些
    .config("spark.sql.shuffle.partitions", 8) \ # 本地模式分区数不用太多
    .getOrCreate()

sc = spark.sparkContext   # 获取底层 SparkContext，用于 RDD 操作
```

---

## 二、RDD：转换算子与行动算子

RDD 是 Spark 最底层的抽象，所有操作分为两类：

### 核心区别

| | 转换算子 Transformation | 行动算子 Action |
|------|------|------|
| **执行时机** | 惰性（Lazy），不立即执行 | 立即触发计算 |
| **返回值** | 返回新的 RDD | 返回具体值或写入外部存储 |
| **DAG 角色** | 构建 DAG 执行计划 | 提交 Job 执行 DAG |
| **调用次数** | 可多次链式调用 | 一次调用触发一个 Job |

> **理解**：Transformation 只是"记下要做什么"，Action 才是"动手做"。所有转换算子都只构建执行计划，直到遇到 Action 才真正触发计算。

---

### 2.1 转换算子合集（Transformation）

#### 映射类（map 族）

```python
# map：一对一映射，每个元素返回一个新元素
rdd.map(lambda x: x * 2)                       # [1,2,3] → [2,4,6]
rdd.map(lambda x: (x, 1))                      # 转为键值对

# flatMap：一对多映射，返回扁平化结果
rdd.flatMap(lambda x: x.split(","))            # ["a,b", "c"] → ["a","b","c"]
rdd.flatMap(lambda x: [x, x*2])                # [1,2] → [1,2,2,4]

# mapPartitions：按分区操作，一次处理整个分区，减少函数调用开销
# 适合需要连接数据库：一个分区共用一个连接
rdd.mapPartitions(lambda iter: [sum(iter)])    # 每个分区计算总和

# mapPartitionsWithIndex：带分区索引
rdd.mapPartitionsWithIndex(lambda idx, iter: [(idx, sum(iter))])

# mapValues：只对键值对的 value 做映射，保留 key
kv_rdd.mapValues(lambda v: v + 1)              # [("a",1)] → [("a",2)]

# flatMapValues：对 value 做一对多映射
kv_rdd.flatMapValues(lambda v: range(v))       # [("a",3)] → [("a",0),("a",1),("a",2)]
```

#### 过滤类

```python
# filter：保留满足条件的元素
rdd.filter(lambda x: x > 3)

# distinct：去重（涉及 shuffle）
rdd.distinct()
rdd.distinct(numPartitions=4)                  # 指定分区数

# sample：随机抽样
rdd.sample(withReplacement=False, fraction=0.5, seed=42)  # 不放回抽50%
rdd.sample(withReplacement=True,  fraction=2.0)          # 放回抽，可能重复

# randomSplit：按比例拆成多个 RDD
rdd1, rdd2 = rdd.randomSplit([0.7, 0.3], seed=42)
```

#### 集合/分区类

```python
# union：合并两个 RDD（不去重，简单拼接）
rdd1.union(rdd2)

# intersection：取交集（涉及 shuffle）
rdd1.intersection(rdd2)

# subtract：差集（在 rdd1 但不在 rdd2，涉及 shuffle）
rdd1.subtract(rdd2)

# cartesian：笛卡尔积（慎用，数据量暴涨）
rdd1.cartesian(rdd2)

# zip：按位置配对，要求两 RDD 分区个数和每个分区元素个数相同
rdd1.zip(rdd2)

# zipWithIndex：给每个元素加上索引
rdd.zipWithIndex()

# coalesce：减少分区数（不 shuffle，只合并）
rdd.coalesce(2)

# repartition：重新分区（会 shuffle，可增可减）
rdd.repartition(8)

# partitionBy：按指定分区器重新分区（仅 PairRDD）
kv_rdd.partitionBy(4)
```

#### 排序类

```python
# sortBy：按指定规则排序（触发 shuffle）
rdd.sortBy(lambda x: x, ascending=False)

# sortByKey：按 key 排序（仅 PairRDD）
kv_rdd.sortByKey(ascending=False)
kv_rdd.sortByKey(ascending=False, numPartitions=4)
```

#### 键值对聚合类（PairRDD）

```python
# reduceByKey：按 key 聚合，先在分区内合并再 shuffle → 推荐优先使用
kv_rdd.reduceByKey(lambda a, b: a + b)

# groupByKey：按 key 分组，全量 shuffle → 数据量大易 OOM，不推荐
kv_rdd.groupByKey().mapValues(len)

# aggregateByKey：更灵活的聚合，可指定初始值和不同类型的输出
kv_rdd.aggregateByKey(0, lambda acc, v: max(acc, v), lambda a, b: a + b)

# foldByKey：带初始值的 reduceByKey
kv_rdd.foldByKey(0, lambda a, b: a + b)

# combineByKey：最底层的聚合，完全自定义
kv_rdd.combineByKey(
    lambda v: (v, 1),                         # 创建初始累加器
    lambda acc, v: (acc[0] + v, acc[1] + 1),  # 分区内合并
    lambda a, b: (a[0] + b[0], a[1] + b[1])   # 分区间合并
)

# groupBy：按自定义规则分组
rdd.groupBy(lambda x: x % 2)

# keyBy：用函数生成 key
rdd.keyBy(lambda x: x[0])
```

#### 键值对连接类（PairRDD）

```python
# join：内连接
rdd1.join(rdd2)              # (k, (v1, v2))

# leftOuterJoin / rightOuterJoin / fullOuterJoin
rdd1.leftOuterJoin(rdd2)     # (k, (v1, Some(v2)))
rdd1.rightOuterJoin(rdd2)    # (k, (Some(v1), v2))
rdd1.fullOuterJoin(rdd2)     # (k, (Option(v1), Option(v2)))

# cogroup：按 key 将多个 RDD 的值分组
rdd1.cogroup(rdd2)           # (k, (iter1, iter2))

# subtractByKey：删除 rdd1 中与 rdd2 key 相同的元素
rdd1.subtractByKey(rdd2)
```

#### 其他

```python
# pipe：每个分区通过管道传给外部脚本处理
rdd.pipe("shell_script.sh")

# glom：将每个分区的元素合并为列表
rdd.glom()                   # [[1,2], [3,4,5]]（每个分区一个列表）
```

---

### 2.2 行动算子合集（Action）

#### 输出到 Driver

```python
# collect：将所有数据拉取到 Driver（数据量大时 OOM，慎用）
rdd.collect()

# take：取前 N 条
rdd.take(10)

# top：取最大的 N 条（内部先做排序）
rdd.top(5)                                    # 最大的5个
rdd.top(5, key=lambda x: x[1])               # 按规则取 top

# takeOrdered：取排序后前 N 条
rdd.takeOrdered(5)                            # 最小的5个
rdd.takeOrdered(5, key=lambda x: -x)          # 按规则排序后取

# first：取第一条
rdd.first()

# takeSample：随机取 N 条（Action）
rdd.takeSample(withReplacement=False, num=10, seed=42)
```

#### 聚合计算

```python
# count：元素总数
rdd.count()

# countByValue / countByKey：按值/key 计数（返回 dict）
rdd.countByValue()                            # {value: count, ...}
kv_rdd.countByKey()                           # {key: count, ...}

# countApprox：近似计数（可设超时）
rdd.countApprox(timeout=1000, confidence=0.95)

# reduce：两两聚合，返回一个值
rdd.reduce(lambda a, b: a + b)

# fold：带初始值的 reduce
rdd.fold(0, lambda a, b: a + b)

# aggregate：通用聚合，类型可与元素不同
rdd.aggregate((0, 0.0),
    lambda acc, x: (acc[0] + 1, acc[1] + x),  # 分区内
    lambda a, b: (a[0] + b[0], a[1] + b[1]))   # 分区间

# max / min：最大/最小值
rdd.max()
rdd.min()

# sum / mean：求和/平均值（仅数值类型）
rdd.sum()
rdd.mean()

# stats：一次性计算 count/mean/stdev/max/min
rdd.stats()

# variance / stdev：方差 / 标准差
rdd.variance()
rdd.stdev()

# histogram：直方图
rdd.histogram(10)                              # 10等分统计
rdd.histogram([0, 60, 80, 100])               # 指定区间
```

#### 遍历

```python
# foreach：对每个元素执行操作（无返回值，在 Executor 端执行）
rdd.foreach(lambda x: print(x))

# foreachPartition：按分区操作（推荐，每个分区一个连接）
rdd.foreachPartition(lambda iter: save_to_db(iter))
```

#### 保存到外部

```python
# saveAsTextFile：保存为文本文件
rdd.saveAsTextFile("hdfs://output/path")
rdd.saveAsTextFile("hdfs://output/", compressionCodecClass="org.apache.hadoop.io.compress.GzipCodec")

# saveAsSequenceFile：保存为 SequenceFile（Hadoop 格式）
kv_rdd.saveAsSequenceFile("hdfs://output/")

# saveAsObjectFile：保存为序列化对象
rdd.saveAsObjectFile("hdfs://output/")

# saveAsPickleFile：保存为 Pickle 格式（Python 专用）
rdd.saveAsPickleFile("hdfs://output/")
```

#### 其他

```python
# isEmpty：判断是否为空
rdd.isEmpty()

# lookup：查找指定 key 的所有值（返回列表）
kv_rdd.lookup("key1")

# collectAsMap：转为 dict（仅 PairRDD）
kv_rdd.collectAsMap()

# toLocalIterator：逐批拉取迭代器（比 collect 省内存）
for item in rdd.toLocalIterator():
    process(item)
```

---

### 2.3 创建 RDD

```python
# 从集合创建
rdd = sc.parallelize([1, 2, 3, 4, 5])
rdd = sc.parallelize(data, numSlices=4)       # 指定分区数

# 从文件创建
rdd = sc.textFile("hdfs://path/to/file.txt")
rdd = sc.textFile("hdfs://path/", minPartitions=8)
rdd = sc.wholeTextFiles("dir/")               # (文件名, 文件内容)

# 从其他 RDD 创建
rdd = sc.union([rdd1, rdd2, rdd3])
rdd = sc.emptyRDD()                           # 空 RDD
```

---

## 三、DataFrame API

### 读取数据

```python
# ============================================================
# CSV 文件读取
# ============================================================
df = spark.read.csv(
    "path/to/file.csv",                        # 文件路径，支持 HDFS / S3 / 本地
    header=True,                               # 第一行作为列名，默认 False
    inferSchema=True,                          # 自动推断列类型（生产环境建议手动指定 schema）
    sep=",",                                   # 分隔符，默认逗号
    encoding="utf-8",                          # 文件编码
    nullValue="NA",                            # 将指定字符串视为 null
    quote='"',                                 # 引号字符
    escape='"',                                # 转义字符
    mode="PERMISSIVE",                         # 脏数据模式：PERMISSIVE（跳过）/DROPMALFORMED（丢弃）/FAILFAST（报错）
    multiLine=True,                            # 一个单元格是否可跨多行
)

# ============================================================
# JSON 文件读取
# ============================================================
df = spark.read.json(
    "path/to/file.json",
    multiLine=True,                            # JSON 是否跨多行（单行 JSON 更高效）
    allowSingleQuotes=True,                    # 允许单引号
    allowNumericLeadingZero=True,               # 允许数字前导零（如 00123）
)

# ============================================================
# Parquet 文件读取（列存 + 压缩，生产环境首选）
# ============================================================
df = spark.read.parquet("path/to/file.parquet")
# 支持按分区自动发现，例如 parquet("data/year=2025/month=06/")
# 支持谓词下推：读取时自动跳过不满足过滤条件的数据块

# ============================================================
# JDBC 数据库读取
# ============================================================
df = spark.read.jdbc(
    url="jdbc:mysql://host:3306/db",           # JDBC 连接地址
    table="table_name",                        # 表名或子查询 "(SELECT * FROM t WHERE ...) AS tmp"
    properties={
        "user": "root",
        "password": "123456",
        "driver": "com.mysql.cj.jdbc.Driver",  # 驱动类
        "fetchsize": "5000",                   # 每次拉取行数
    }
)
# 分区读取（提高并发）需额外参数：numPartitions, partitionColumn, lowerBound, upperBound

# ============================================================
# Spark SQL 查询结果
# ============================================================
df = spark.sql("SELECT * FROM table")          # 需要先注册临时视图

# ============================================================
# 读取时手动指定 schema（推荐！避免 inferSchema 全表扫描）
# ============================================================
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, FloatType, TimestampType

schema = StructType([
    StructField("name",      StringType(),    True),   # True = 可为空
    StructField("age",       IntegerType(),   True),
    StructField("score",     FloatType(),     True),
    StructField("create_at", TimestampType(), True),
])
df = spark.read.csv("data.csv", header=True, schema=schema)
```

### 写入数据

```python
df.write.mode("overwrite").csv("output/", header=True)
df.write.mode("append").parquet("output/")
df.write.mode("ignore").json("output/")
df.write.jdbc(url, table, properties=props)

# mode: append / overwrite / ignore / error(默认)
```

### 查看数据

```python
df.show(10, truncate=False)
df.printSchema()
df.columns
df.count()
df.describe().show()
df.select("name").show(5)
df.first()               # Row 对象
df.take(5)               # list of Row
```

### 选择与别名

```python
from pyspark.sql.functions import col

df.select("name", "age")
df.select(col("name").alias("姓名"), col("age") + 1)

df.selectExpr("name as 姓名", "age + 1 as age_new")
df.selectExpr("*", "score / 100 as ratio")
```

### 过滤

```python
df.filter(col("age") >= 18)
df.filter((col("age") >= 18) & (col("score") > 80))
df.filter(col("name").isin("张三", "李四"))
df.filter(col("name").like("张%"))
df.filter(col("name").rlike(r"^张"))
df.filter(col("name").isNull())
df.filter(col("name").isNotNull())

# SQL 风格
df.where("age >= 18 AND score > 80")
```

### 增加列

```python
df.withColumn("age_next", col("age") + 1)
df.withColumn("level", when(col("score") >= 90, "A").otherwise("B"))
df.withColumnRenamed("old_name", "new_name")
```

### 删除与去重

```python
df.drop("col1", "col2")
df.distinct()
df.dropDuplicates(["name", "age"])
df.dropna(subset=["name", "score"])
df.fillna({"score": 0, "name": "unknown"})
```

---

## 四、常用函数

```python
from pyspark.sql import functions as F

# 聚合
df.agg(F.avg("score"), F.sum("score"), F.max("score"), F.min("score"))
df.agg(F.countDistinct("name").alias("unique_names"))

# 统计信息
df.select(F.mean("score"), F.stddev("score"), F.variance("score"))

# 字符串
F.upper(col("name"))
F.lower(col("name"))
F.trim(col("name"))
F.substring(col("name"), 1, 3)
F.concat(col("a"), F.lit(" "), col("b"))
F.concat_ws("-", col("a"), col("b"))
F.regexp_extract(col("text"), r"\d+", 0)
F.regexp_replace(col("text"), r"\s+", "_")
F.split(col("text"), ",")
F.length(col("text"))

# 日期
F.current_date()
F.current_timestamp()
F.date_add(col("date"), 7)
F.date_sub(col("date"), 7)
F.datediff(col("end_date"), col("start_date"))
F.year(col("date"))
F.month(col("date"))
F.dayofweek(col("date"))
F.date_format(col("date"), "yyyy-MM-dd")
F.to_date(col("str"), "yyyy-MM-dd")

# 数学
F.round(col("num"), 2)
F.ceil(col("num"))
F.floor(col("num"))
F.abs(col("num"))
F.log(col("num"))
F.exp(col("num"))

# 条件
F.when(col("score") >= 90, "优秀") \
 .when(col("score") >= 60, "及格") \
 .otherwise("不及格")
F.coalesce(col("a"), col("b"), F.lit("default"))  # 第一个非空值

# 数组
F.explode(col("array_col"))        # 行展开
F.array_contains(col("arr"), "x")
F.size(col("arr"))
F.array(col("a"), col("b"))        # 构造数组
```

---

## 五、分组聚合

```python
# 基础分组
df.groupBy("class").agg(
    F.avg("score").alias("avg_score"),
    F.count("*").alias("cnt"),
    F.max("score").alias("max_score")
).orderBy("avg_score", ascending=False)

# 多列分组
df.groupBy("class", "gender").agg(F.avg("score"))

# cube / rollup：多维分析
df.cube("class", "gender").agg(F.avg("score"))   # 所有维度组合
df.rollup("class", "gender").agg(F.avg("score")) # 层级汇总

# pivot：行转列
df.groupBy("class").pivot("gender").agg(F.avg("score"))
```

---

## 六、窗口函数

```python
from pyspark.sql.window import Window

window_spec = Window.partitionBy("class").orderBy(col("score").desc())

# 排名
df.withColumn("rn", F.row_number().over(window_spec))
df.withColumn("rank", F.rank().over(window_spec))
df.withColumn("dense_rank", F.dense_rank().over(window_spec))
df.withColumn("ntile", F.ntile(4).over(window_spec))

# 聚合窗口
df.withColumn("class_avg", F.avg("score").over(Window.partitionBy("class")))
df.withColumn("running_total", F.sum("score").over(Window.orderBy("id")))
df.withColumn("cum_count", F.count("*").over(Window.orderBy("id").rowsBetween(Window.unboundedPreceding, Window.currentRow)))

# 偏移
df.withColumn("prev", F.lag("score", 1, 0).over(window_spec))
df.withColumn("next", F.lead("score", 1, 0).over(window_spec))
df.withColumn("first", F.first("score").over(window_spec))
df.withColumn("last", F.last("score").over(window_spec))

# TopN：每班分数最高的3个
df.withColumn("rn", F.row_number().over(window_spec)).filter(col("rn") <= 3)

# 移动平均（前后各一行）
rolling = Window.orderBy("date").rowsBetween(-1, 1)
df.withColumn("moving_avg", F.avg("score").over(rolling))
```

---

## 七、JOIN 操作

```python
df1.join(df2, on="id", how="inner")
df1.join(df2, df1["id"] == df2["user_id"], how="left")
df1.join(df2, on=["key1", "key2"], how="left")

# how: inner / left / right / full / cross / left_anti / left_semi

# left_anti：在左表但不在右表（类似 NOT IN）
df1.join(df2, on="id", how="left_anti")

# left_semi：左表中能在右表匹配到的行（比 INNER 高效）
df1.join(df2, on="id", how="left_semi")

# broadcast join：小表广播，避免 shuffle
from pyspark.sql.functions import broadcast
df_big.join(broadcast(df_small), on="key", how="left")

# 去重 join（防止数据膨胀）
df1.join(df2.dropDuplicates(["key"]), on="key")
```

---

## 八、union 与集合操作

```python
df1.union(df2)              # 不去重（要求列数相同）
df1.unionByName(df2)        # 按列名匹配，不去重
df1.unionAll(df2)           # 同 union

df1.intersect(df2)          # 交集
df1.exceptAll(df2)          # 差集
```

---

## 九、UDF（用户自定义函数）

```python
from pyspark.sql.functions import udf
from pyspark.sql.types import StringType, IntegerType

# Python UDF（较慢，涉及 Python ↔ JVM 序列化）
@udf(returnType=StringType())
def grade(score):
    if score >= 90:
        return "优秀"
    elif score >= 60:
        return "及格"
    else:
        return "不及格"

df.withColumn("level", grade(col("score")))

# 推荐：优先用内置函数组合，避免 UDF
# 推荐：Pandas UDF（向量化，更快）
from pyspark.sql.functions import pandas_udf
import pandas as pd

@pandas_udf("double")
def add_one_pandas(s: pd.Series) -> pd.Series:
    return s + 1
```

---

## 十、Spark SQL

```python
# 注册临时视图
df.createOrReplaceTempView("student")
df.createGlobalTempView("global_student")  # 跨 session 可用

# 查询
result = spark.sql("""
    SELECT class_id,
           AVG(score) AS avg_score,
           COUNT(*) AS cnt
    FROM student
    WHERE age >= 18
    GROUP BY class_id
    HAVING avg_score >= 80
    ORDER BY avg_score DESC
""")

# 窗口函数 SQL 写法
spark.sql("""
    SELECT name, class_id, score,
           ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY score DESC) AS rn,
           AVG(score) OVER (PARTITION BY class_id) AS class_avg
    FROM student
""").show()

# 创建/替换
spark.sql("CREATE TABLE IF NOT EXISTS tb AS SELECT * FROM df")
spark.sql("INSERT INTO tb SELECT * FROM df2")
```

---

## 十一、数据分区

```python
# 写入时分区
df.write.partitionBy("year", "month").parquet("output/")

# coalesce：减少分区数（不 shuffle，效率高）
df.coalesce(1).write.csv("output/")

# repartition：重新分区（触发 shuffle）
df.repartition(10)
df.repartition("class")                    # 按列分区
df.repartition(10, "class")               # 按列分10个区

# 调整 shuffle 分区数
spark.conf.set("spark.sql.shuffle.partitions", 200)
```

---

## 十二、缓存与持久化

```python
df.cache()           # 默认 MEMORY_AND_DISK
df.persist()         # 同 cache

from pyspark import StorageLevel
df.persist(StorageLevel.MEMORY_ONLY)
df.persist(StorageLevel.MEMORY_AND_DISK)
df.persist(StorageLevel.DISK_ONLY)

df.unpersist()       # 释放缓存
```

---

## 十三、性能优化要点

| 优化项 | 做法 |
|--------|------|
| 避免 `collect()` | 大数据集 collect 会 OOM，用 `take()` 或 `write` |
| 减少 shuffle | `reduceByKey` > `groupByKey`、broadcast join |
| 尽早过滤 | 先 `filter` 再 `join`，减少数据量 |
| 避免 UDF | 优先用内置函数，UDF 可考虑 Pandas UDF |
| 合理分区 | 分区数 ≈ 总核数的 2~3 倍 |
| 推断 schema 关闭 | 大文件不用 `inferSchema=True`，手动指定 schema |
| 数据倾斜 | 加盐（salt）打散 key |
| 文件格式 | Parquet（列存 + 压缩 + 谓词下推）> CSV/JSON |

### 数据倾斜处理

```python
# 加盐打散
df_skewed = df.withColumn("salt", (F.rand() * 10).cast("int"))
df_with_salt = df_skewed.withColumn("salted_key", F.concat(col("key"), F.lit("_"), col("salt")))
# 做 join ...
# 再去除 salt
```

### 广播变量与累加器

```python
# 广播变量：只读共享数据
broadcast_dict = sc.broadcast({"k1": "v1", "k2": "v2"})
broadcast_dict.value["k1"]

# 累加器：各节点累加
counter = sc.accumulator(0)
rdd.foreach(lambda x: counter.add(1))
print(counter.value)
```

---

## 十四、数据源读取速查

| 格式 | 读取 | 写入 |
|------|------|------|
| CSV | `spark.read.csv()` | `df.write.csv()` |
| JSON | `spark.read.json()` | `df.write.json()` |
| Parquet | `spark.read.parquet()` | `df.write.parquet()` |
| JDBC | `spark.read.jdbc()` | `df.write.jdbc()` |
| Hive | `spark.sql("SELECT * FROM table")` | `df.write.saveAsTable("table")` |

### JDBC 配置示例

```python
df = spark.read \
    .format("jdbc") \
    .option("url", "jdbc:mysql://host:3306/db") \
    .option("dbtable", "table_name") \
    .option("user", "root") \
    .option("password", "123456") \
    .option("numPartitions", 10) \
    .option("partitionColumn", "id") \
    .option("lowerBound", 1) \
    .option("upperBound", 100000) \
    .option("fetchsize", 5000) \
    .load()
```

---
*最后更新: 2025-06-23*
