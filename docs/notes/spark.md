# Spark 笔记

## 一、概述

### 什么是 Spark

Apache Spark 是**分布式内存计算引擎**，由 UC Berkeley AMPLab 于 2009 年开发，2013 年成为 Apache 顶级项目。比 Hadoop MapReduce 快 10~100 倍，核心优势是**内存迭代计算**和**统一的编程模型**。

**一句话：Spark = Hadoop MapReduce 的升级版，支持内存计算、流处理、SQL、ML、图计算，一套引擎搞定。**

### 核心定位

| 问题 | 答案 |
|------|------|
| **解决什么问题** | MapReduce 太慢（每次都要读写 HDFS），不适合迭代计算和交互查询 |
| **怎么解决** | 基于内存的计算模型，中间结果放内存而非 HDFS，减少磁盘 IO |
| **适用场景** | 批处理、流处理、交互式 SQL 查询、机器学习、图计算 |
| **不适用场景** | 毫秒级实时响应（用 Flink/Storm）、小数据单机处理（直接用 Python） |

---

## 二、核心设计思想

### 2.1 内存计算

MapReduce 每轮计算都读写 HDFS（磁盘）。Spark 把中间结果缓存在内存中，后续步骤直接从内存读取。

```
MapReduce:  读写HDFS → 计算 → 读写HDFS → 计算 → 读写HDFS（磁盘IO大）
Spark:      读HDFS → 计算 → 内存(缓存) → 计算 → 内存 → 写HDFS（磁盘IO小）
```

### 2.2 惰性计算（Lazy Evaluation）

Transformation 不立即执行，只构建执行计划（DAG）。遇到 Action 才真正触发计算。好处是 Spark 可以全局优化整个计算流程。

### 2.3 DAG 执行引擎

不像 MapReduce 固定分两阶段（Map → Reduce），Spark 构建有向无环图（DAG），自动划分 Stage，优化执行路径，减少不必要的 shuffle 和数据传输。

### 2.4 统一技术栈

一套引擎覆盖：批处理（Spark Core）、SQL 分析（Spark SQL）、流处理（Streaming）、机器学习（MLlib）、图计算（GraphX）。不用维护多套系统。

---

## 三、架构

```
┌────────────────────────────────────────────────────┐
│                   Driver Program                   │
│  ┌───────────────────────────────────────────────┐ │
│  │                SparkContext                   │ │
│  │  ┌────────────┐ ┌─────────────┐  ┌──────────┐ │ │
│  │  │DAGScheduler│ │TaskScheduler│  │BlockMgr  │ │ │
│  │  │ DAG→Stage  │ │ Task分发    │  │  内存管理 │ │ │
│  │  └────────────┘ └─────────────┘  └──────────┘ │ │
│  └───────────────────────────────────────────────┘ │
└──────────────────────┬─────────────────────────────┘
                       │ 提交 Job
┌──────────────────────▼──────────────────────────────┐
│               Cluster Manager                       │
│     Standalone │ YARN │ Mesos │ Kubernetes          │
└──────────────────────┬──────────────────────────────┘
                       │ 分配资源
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Executor │     │ Executor │     │ Executor │    (JVM 进程)
│ ┌──────┐ │     │ ┌──────┐ │     │ ┌──────┐ │
│ │ Task │ │     │ │ Task │ │     │ │ Task │ │    (线程)
│ └──────┘ │     │ └──────┘ │     │ └──────┘ │
│ ┌──────┐ │     │ ┌──────┐ │     │          │
│ │ Task │ │     │ │ Task │ │     │          │
│ └──────┘ │     │ └──────┘ │     │          │
└──────────┘     └──────────┘     └──────────┘
```

### 三大核心角色

| 角色 | 节点 | 职责 |
|------|:---:|------|
| **Driver** | 主 | 运行 main()，创建 SparkContext；解析代码生成 DAG；划分 Stage；调度 Task |
| **Cluster Manager** | — | 资源管理，分配 Executor（Standalone / YARN / K8s / Mesos） |
| **Executor** | 从 | JVM 进程，运行 Task；将计算结果缓存到内存或磁盘；向 Driver 汇报状态 |

### 执行流程

```
1. Driver 提交 Application 到 Cluster Manager
2. Cluster Manager 分配资源，启动 Executor
3. Driver 将代码转成 DAG → 划分 Stage → 生成 Task
4. Driver 把 Task 发送给 Executor 执行
5. Executor 执行 Task，中间结果缓存到内存
6. Executor 返回结果给 Driver，或直接写入 HDFS
```

---

## 四、执行模型详解

### 4.1 从代码到 Task

```
Application (你的 .py / .jar)
    │
    ▼
Job（每个 Action 触发一个 Job）
    │
    ▼
Stage（按 Shuffle 边界划分，没有 Shuffle 的就是一个 Stage）
    │
    ▼
Task（Stage 内按分区拆分，一个分区一个 Task，Task 是最小执行单元）
```

### 4.2 DAG 与 Stage 划分

```
示例：rdd.map(...).filter(...).groupByKey().map(...).reduceByKey(...).collect()

  ┌─────────┐
  │ collect │  Action → 触发计算
  └────┬────┘
       │
  ┌────▼─────────┐
  │ reduceByKey  │  ─── Shuffle 边界 ─────────┐
  └────┬─────────┘                            │
       │                                      │
  ┌────▼────┐                                 │  Stage 2
  │   map   │                                 │ (shuffle read + reduce)
  └────┬────┘                                 │
       │  ─── Shuffle 边界────┐               │
  ┌────▼─────────┐            │               │
  │  groupByKey  │            │               │
  └────┬─────────┘            │               │
       │                      │               │
  ┌────▼────┐                 │  Stage 1      │
  │  filter │                 │(shuffle write)│
  └────┬────┘                 │               │
       │                      │               │
  ┌────▼────┐                 │               │
  │   map   │                 │               │
  └─────────┘  Stage 0 ───────┘───────────────┘
```

**Stage 划分规则**：遇到宽依赖（Shuffle）就切分新 Stage。窄依赖（map/filter）因为不需要 shuffle，可合并在同一 Stage 内以流水线方式执行。

### 4.3 宽依赖 vs 窄依赖

| | 窄依赖（Narrow） | 宽依赖（Wide / Shuffle） |
|------|------|------|
| **定义** | 父 RDD 的每个分区最多被一个子分区使用 | 父 RDD 的分区被多个子分区使用 |
| **特点** | 不需要 shuffle，同分区内流水线执行 | 需要网络传输，触发 shuffle |
| **算子** | `map` `filter` `flatMap` `mapPartitions` `union` | `groupByKey` `reduceByKey` `join` `distinct` `sortBy` |
| **性能** | 快，内存操作 | 慢，涉及磁盘和网络 IO |

> 宽依赖 = Shuffle = 新 Stage 的起点。减少 Shuffle 是 Spark 调优的核心目标。

### 4.4 Shuffle 机制

```
Map Task 端（Shuffle Write）：
  1. 将结果按 key 分区写入本地磁盘
  2. 写入前排序 + 可选预聚合（map-side combine）
  
Reduce Task 端（Shuffle Read）：
  3. 从各个 Map 端拉取自己的分区数据
  4. 合并、排序、传给后续计算

优化：
  - 适当增大 spark.sql.shuffle.partitions（默认200）
  - 开启 spark.sql.adaptive.enabled（AQE 动态调整）
  - 使用 broadcast join 避免 shuffle
```

---

## 五、五大核心组件

| 组件 | 解决什么问题 | 核心能力 |
|------|-------------|----------|
| **Spark Core** | 分布式计算基础 | RDD、DAG 调度、内存管理、容错 |
| **Spark SQL** | 结构化数据处理 | DataFrame/Dataset、SQL 查询、与 Hive 集成 |
| **Spark Streaming** | 实时流处理 | 微批处理、有状态操作、窗口计算 |
| **MLlib** | 机器学习 | 分类、回归、聚类、推荐、特征工程 |
| **GraphX** | 图计算 | PageRank、连通分量、图算法 |

> PySpark 笔记已覆盖 Spark Core（RDD）和 Spark SQL（DataFrame）的 API，此处不重复。

### Spark SQL 补充：DataFrame vs RDD

| | RDD | DataFrame |
|------|------|------|
| **抽象层级** | 低层，操作对象 | 高层，表结构 |
| **Schema** | 无，运行时推断 | 有明确的列名和类型 |
| **优化** | 不优化 | Catalyst 优化器 + Tungsten 内存管理 |
| **性能** | 较慢 | 快 2~10 倍 |
| **语言支持** | Java/Scala/Python | Java/Scala/Python/R |
| **推荐** | 非结构化/底层操作 | **结构化数据优先用 DataFrame** |

### Spark Streaming：DStream vs Structured Streaming

```python
# DStream（旧 API，基于 RDD，微批处理）
# 已逐步淘汰，不推荐新项目使用

# Structured Streaming（新 API，基于 DataFrame，支持事件时间）
df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "topic_name") \
    .load()

query = df.writeStream \
    .outputMode("append") \                   # append / complete / update
    .format("console") \
    .trigger(processingTime="10 seconds") \    # 触发间隔
    .option("checkpointLocation", "/checkpoint/") \  # 容错检查点
    .start()

query.awaitTermination()
```

---

## 六、部署模式

```bash
# 1. Local 模式（开发/测试）
spark-submit --master local[*] app.py        # 所有核
spark-submit --master local[4] app.py        # 4 个核

# 2. Standalone 模式（Spark 自带集群）
spark-submit --master spark://master:7077 app.py

# 3. YARN 模式（生产最常用）
spark-submit --master yarn --deploy-mode client app.py    # Driver 在提交机
spark-submit --master yarn --deploy-mode cluster app.py   # Driver 在 YARN 集群
spark-submit --master yarn --num-executors 50 --executor-memory 4g --executor-cores 2 app.py

# 4. Kubernetes 模式（云原生趋势）
spark-submit --master k8s://https://k8s-api:6443 --deploy-mode cluster app.py
```

| 模式 | 适用场景 |
|------|----------|
| **Local** | 本地开发调试、单元测试 |
| **Standalone** | 小团队、不需要 YARN 时 |
| **YARN** | 生产环境（与 Hadoop 共享集群） |
| **Kubernetes** | 容器化部署、弹性伸缩 |

### Spark on YARN 两种模式

| | Client 模式 | Cluster 模式 |
|------|------|------|
| Driver 位置 | 提交任务的机器上 | YARN 集群内某节点 |
| 适用 | 调试、交互查询（spark-shell） | 生产批量任务 |
| 风险 | 提交机故障，任务失败 | 高可用，Driver 挂了 YARN 可重试 |
| 日志 | 直接在提交机看 | 用 `yarn logs` 查看 |

---

## 七、核心优势

| 优势 | 说明 |
|------|------|
| **速度快** | 基于内存，比 MR 快 10~100 倍 |
| **易用** | 提供 Python/Java/Scala/R/SQL 多语言 API |
| **统一** | 批处理 + 流处理 + SQL + ML + 图计算，一个引擎 |
| **兼容** | 可跑在 YARN/K8s 上，兼容 Hadoop 生态（HDFS/Hive/HBase） |
| **活跃** | 社区庞大，文档完善，生产中广泛使用 |
| **高级优化** | Catalyst 优化器、Tungsten 内存管理、AQE 自适应执行 |

### Spark vs MapReduce

| 维度 | Spark | MapReduce |
|------|------|------|
| **计算方式** | 内存 + 磁盘 | 磁盘为主 |
| **速度** | 比 MR 快 10~100 倍 | 基准 |
| **编程模型** | RDD/DF/SQL 多种 API | 只有 Map 和 Reduce 两个接口 |
| **迭代计算** | 中间结果存内存，天然快 | 每次迭代读写 HDFS，极慢 |
| **流处理** | 原生支持 | 不支持（需额外组件） |
| **容错** | RDD 血缘（Lineage）重算 | Task 失败重跑 |
| **资源管理** | 支持多种（Standalone/YARN/K8s） | 仅 YARN |
| **适用** | 批处理、流处理、ML、交互查询 | 仅离线批处理 |

---

## 八、内存管理

### Executor 内存分布

```
┌─────────────────────────────────────────────┐
│              Executor Memory                │
│  ┌───────────────────┬─────────────────────┐│
│  │   Reserved Memory │  300MB（预留系统）   ││
│  │   User Memory     │  用户自定义数据结构   ││
│  │   Spark Memory    │  执行 + 存储（统一）  ││
│  │   ┌──────────────┐│                      ││
│  │   │ Storage      ││  缓存 RDD/DF 数据    ││
│  │   │ Execution    ││  Shuffle/Join/Agg   ││
│  │   └──────────────┘│  两者可互相借用      ││
│  └───────────────────┴─────────────────────┘│
└─────────────────────────────────────────────┘
```

### 关键内存参数

```bash
# Executor Memory（总内存）
spark.executor.memory=4g

# Spark Memory 占比 = (1 - 300MB - userMemoryFraction) * spark.memory.fraction
spark.memory.fraction=0.6           # 默认 60% 给执行+存储

# 执行与存储占比
spark.memory.storageFraction=0.5    # 存储和执行各占 Spark Memory 的 50%

# Off-Heap 内存（堆外，减少 GC）
spark.memory.offHeap.enabled=true
spark.memory.offHeap.size=2g
```

---

## 九、性能优化

### 参数调优

```bash
# ======== 内存 ========
spark.executor.memory=8g                    # Executor 总内存
spark.driver.memory=4g                      # Driver 内存（collect 大结果时需要大）
spark.memory.fraction=0.6                   # 执行+存储占比

# ======== 并行度 ========
spark.sql.shuffle.partitions=200            # shuffle 分区数（默认200，数据大可增大）
spark.default.parallelism=16                # RDD 默认并行度
spark.sql.files.maxPartitionBytes=134217728 # 读取文件时单分区最大128MB

# ======== 序列化 ========
spark.serializer=org.apache.spark.serializer.KryoSerializer  # Kryo 比 Java 序列化快10倍

# ======== 自适应查询 ========
spark.sql.adaptive.enabled=true                        # AQE，Spark 3.0+ 核心特性
spark.sql.adaptive.coalescePartitions.enabled=true     # 动态合并小分区
spark.sql.adaptive.skewJoin.enabled=true               # 自动处理 JOIN 数据倾斜

# ======== 动态资源 ========
spark.dynamicAllocation.enabled=true                   # 按需申请/释放 Executor
spark.dynamicAllocation.minExecutors=5
spark.dynamicAllocation.maxExecutors=100
```

### 优化原则

| 原则 | 做法 |
|------|------|
| **减少 Shuffle** | `reduceByKey` > `groupByKey`；broadcast join 替代普通 join |
| **尽早过滤** | 先 WHERE 再 JOIN，减少参与 shuffle 的数据量 |
| **合理分区** | 分区数 ≈ 总核数的 2~3 倍；避免数据倾斜（加盐） |
| **使用 DataFrame** | DF 有 Catalyst 优化 + Tungsten，比 RDD 快 2~10 倍 |
| **缓存复用数据** | 被多次使用的 DataFrame 调用 `.cache()` 或 `.persist()` |
| **避免 UDF** | 优先用内置函数；必须用 UDF 时用 Pandas UDF |
| **文件格式** | Parquet/ORC（列存 + 压缩 + 谓词下推）> CSV/JSON |
| **控制 Shuffle 输出** | 适当增大 `shuffle.partitions`，避免单分区数据过大 |

### 持久化与缓存

Spark 的持久化机制可以将中间结果缓存到内存或磁盘，避免重复计算，是性能优化的核心手段。

**为什么需要持久化？**

```python
# 不持久化：df 被多次使用时，每次都从头计算
df = spark.read.parquet("data/").filter(col("date") > "2025-01-01")
df.groupBy("user").count().show()   # 第1次计算：读文件 → filter → groupBy
df.groupBy("city").sum().show()     # 第2次计算：读文件 → filter → groupBy（重复了！）
df.select("user", "amount").show()  # 第3次计算：又来一遍
```

```python
# 持久化后：只在第一次触发计算，后续直接从缓存读取
df = spark.read.parquet("data/").filter(col("date") > "2025-01-01")
df.persist()                        # 标记要缓存，lazy，不立即执行
df.groupBy("user").count().show()   # 第1次：计算完成同时写入缓存
df.groupBy("city").sum().show()     # 第2次：直接从缓存读取，不再重复计算
df.select("user", "amount").show()  # 第3次：同样走缓存
df.unpersist()                      # 用完后释放缓存
```

**cache() vs persist()**

| | `cache()` | `persist()` |
|------|------|------|
| 存储级别 | 固定 `MEMORY_AND_DISK` | 可选，通过参数指定 |
| 参数 | 无 | `StorageLevel` 枚举 |
| 本质 | `persist(MEMORY_AND_DISK)` 的简写 | 通用方法 |

**存储级别（Storage Level）**

| 级别 | 内存 | 磁盘 | 序列化 | 副本 | 适用场景 |
|------|------|------|------|------|------|
| `MEMORY_ONLY` | ✓ | ✗ | ✗ | 1 | 数据量小、内存充足（默认RDD级别） |
| `MEMORY_AND_DISK` | ✓ | ✓ | ✗ | 1 | 内存不够时溢出到磁盘（**最常用**） |
| `MEMORY_ONLY_SER` | ✓ | ✗ | ✓ | 1 | 内存紧张，序列化后存内存（省空间但费CPU） |
| `MEMORY_AND_DISK_SER` | ✓ | ✓ | ✓ | 1 | 数据量大、内存紧张、接受反序列化开销 |
| `DISK_ONLY` | ✗ | ✓ | ✓ | 1 | 内存极度紧张，全落磁盘 |
| `MEMORY_ONLY_2` 等带 `_2` | ✓ | ✗ | ✗ | 2 | 高可用，存两份副本（容错） |
| `OFF_HEAP` | 堆外 | ✗ | ✓ | 1 | 避免 GC，需开启堆外内存 |

```python
from pyspark import StorageLevel

# 四种常用方式
df.cache()                                                     # MEMORY_AND_DISK
df.persist()                                                   # 默认 MEMORY_AND_DISK（DataFrame）
df.persist(StorageLevel.MEMORY_AND_DISK)                       # 明确指定
df.persist(StorageLevel.MEMORY_AND_DISK_SER)                   # 序列化存储，省空间
df.persist(StorageLevel.MEMORY_ONLY)                           # 只用内存

# 检查是否已缓存
print(df.storageLevel)           # StorageLevel(True, True, False, False, 1)
print(df.is_cached)              # True

# 释放缓存
df.unpersist()                   # 同步释放
df.unpersist(blocking=False)     # 异步释放
```

**什么时候该持久化？**

- 一个 DataFrame 被多次 action 触发计算
- 迭代算法中每一轮都要用的数据（如机器学习训练集）
- 从磁盘/HDFS 读取开销大的数据，后续要反复查询
- 经过复杂 Shuffle 计算的中间结果

**什么时候不要持久化？**

- 只用一次的数据 → 持久化反而浪费内存
- 数据量远大于集群内存 → 选序列化或直接重新计算
- 只做一次 `show()` 或 `count()` 的临时结果

**缓存位置与查看**

```python
# Spark UI：http://driver:4040 → Storage 标签页 → 查看缓存占比和大小

# 代码中查看
spark.catalog.clearCache()              # 清空所有缓存
spark.catalog.isCached("table_name")    # 检查某张表是否缓存
```

### 数据倾斜处理

```python
# 场景：某个 key 的数据特别多，导致某个 Task 跑很久甚至 OOM

# 方案1：加盐打散
df = df.withColumn("salted_key", F.concat(col("key"), F.lit("_"), (F.rand()*10).cast("int")))
# ... 做 join ...
# 再去除 salt

# 方案2：开启 AQE 自动处理（Spark 3.0+，推荐）
spark.conf.set("spark.sql.adaptive.enabled", True)
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", True)

# 方案3：两阶段聚合（先局部聚合，再全局聚合）
# 加盐 → 聚合一次 → 去盐 → 再聚合
```

---

## 十、容错机制

### 血统（Lineage）

Spark 不备份数据本身，而是记录 RDD 之间的转换关系（血统）。某个分区丢失时，根据血统从源头重新计算。

```
RDD0 → map → RDD1 → filter → RDD2 → groupBy → RDD3
                                           ↑ 某分区丢失
                                           从 RDD2 重新计算该分区即可
```

### Checkpoint

血统太长时，重算代价大。设置 Checkpoint 将 RDD 写入 HDFS，截断血统链。

```python
sc.setCheckpointDir("hdfs://checkpoint/")
rdd.checkpoint()
```

### 容错对比

| | RDD（血统） | Checkpoint | 缓存 |
|------|------|------|------|
| **恢复方式** | 从源头重算 | 从 HDFS 读取 | 从内存读取 |
| **存储位置** | 不存 | HDFS | 内存/磁盘 |
| **适用** | 默认机制 | 长血统链 | 复用数据 |
| **开销** | 重算耗时 | 写 HDFS 开销 | 占用内存 |

---

## 十一、Spark 生态与趋势

```
                ┌──────────────────────┐
                │     Spark 生态       │
                ├──────────────────────┤
                │ Delta Lake / Iceberg │  湖仓一体（数据湖 + 数仓特性）
                │ Spark ML             │  机器学习
                │ Structured Streaming │  流处理（取代 Spark Streaming）
                │ Spark SQL            │  SQL 分析（最常用）
                │ PySpark              │  Python API
                │ SparkR               │  R API
                └──────────────────────┘
```

> **发展方向**：湖仓一体（Delta Lake/Iceberg）+ Streaming + ML/AI。PySpark 是数据工程师的首选入口。

---

## 十二、RDD 算子详解

### 12.1 转换算子（Transformation）

- **惰性执行**：调用时不运行，只记录 RDD 血缘依赖，返回新 RDD
- 必须等待行动算子触发才会真正执行
- 分为窄依赖、宽依赖（会产生 Shuffle）

### 12.2 行动算子（Action）

- 立即触发任务执行，生成 Job，返回结果 / 写入外部存储
- 不返回 RDD，返回普通集合、数值、写入文件等

### 12.3 常用转换算子

#### 窄依赖（无 Shuffle）

| 算子 | 说明 |
|------|------|
| `map` | 一对一映射 |
| `filter` | 过滤满足条件的数据 |
| `flatMap` | 先 map 再扁平化 |
| `mapPartitions` | 以分区为单位处理数据 |
| `mapPartitionsWithIndex` | 带分区索引处理 |
| `sample` | 随机抽样 |
| `union` | 两个 RDD 简单合并（不去重） |
| `intersection` | 取交集 |
| `subtract` | 差集 |
| `distinct` | 去重（底层有 Shuffle） |
| `groupBy` | 分组（Shuffle） |
| `sortBy` | 排序（Shuffle） |

#### Key-Value 类型转换算子（大多 Shuffle）

| 算子 | 说明 |
|------|------|
| `reduceByKey` | 按 key 聚合 |
| `groupByKey` | 按 key 分组 |
| `aggregateByKey` | 带初始值的聚合 |
| `foldByKey` | 简化版 aggregateByKey |
| `sortByKey` | 按键排序 |
| `join` | 内连接 |
| `leftOuterJoin` / `rightOuterJoin` / `fullOuterJoin` | 外连接 |
| `cogroup` | 两个 RDD 同 key 分组 |

### 12.4 常用行动算子

| 算子 | 说明 |
|------|------|
| `collect()` | 拉取所有数据到 Driver，慎用大数据量 |
| `count()` | 返回 RDD 元素总个数 |
| `first()` | 取第一条数据 |
| `take(n)` | 取前 n 条数据 |
| `takeOrdered(n)` | 排序后取前 n 条 |
| `reduce(func)` | RDD 全局聚合 |
| `aggregate(初始值, 分区内逻辑, 分区间逻辑)` | 全局聚合 |
| `fold(初始值, func)` | 简化全局聚合 |
| `foreach(func)` | 遍历每个元素在 Executor 执行 |
| `foreachPartition` | 遍历每个分区 |
| `saveAsTextFile` / `saveAsSequenceFile` | 写入 HDFS |

---

## 十三、共享变量：累加器 & 广播变量

Spark 默认算子在闭包中使用外部变量时，每个 Task 都会拷贝一份变量副本，变量无法跨 Task 共享、更新不能回传给 Driver。为解决这个问题，提供两类共享变量：

- **累加器（Accumulator）**：只写共享，Task 只能累加，Driver 端读取最终结果（计数器、求和）
- **广播变量（Broadcast）**：只读共享，Driver 分发一次大变量，所有 Task 只读，避免重复传输大对象

### 13.1 累加器（Accumulator）

#### 作用

实现多个 Task 往同一个变量累加数据，只有 Driver 可以读取最终值，Task 只能做 `+=` 累加，不能读取、修改原值。

**适用场景**：统计总条数、异常数据计数、求和、日志错误统计。

#### 特性

| 特性 | 说明 |
|------|------|
| **只写操作** | Task 不能读取累加器的值，防止数据不一致 |
| **惰性求值** | 只有 Action 算子执行后，累加结果才会更新 |
| **重复累加** | 宽依赖多次触发 Action 会导致重复累加（同一个 RDD 多次行动会重复计算） |
| **类型支持** | 支持数值类型、自定义累加器（集合、对象累加） |

#### 常用代码（Scala）

```scala
val sc: SparkContext = ...
// 1. 创建长整型累加器
val acc = sc.longAccumulator("数据计数器")

rdd.foreach(x => {
  if (x < 0) acc.add(1) // Task中只能累加
})

// 2. Driver端获取最终结果
println(acc.value)
```

#### 常见坑

- 转换算子（map/filter）中使用累加器，不执行 Action 不会生效
- RDD 多次重用、多次 Action 会重复累加，建议缓存 RDD

### 13.2 广播变量（Broadcast）

#### 作用

Driver 端把大的只读数据集（配置表、字典、维表）只发送一次到每个 Executor，Executor 内所有 Task 共享同一份数据，避免每个 Task 都拷贝一份大对象，大幅减少网络 IO 与内存占用。

#### 特性

| 特性 | 说明 |
|------|------|
| **只读** | 广播变量不能在 Task 中修改，只能读取 |
| **分发机制** | Driver 先发送到各个 Executor，Executor 内所有 Task 共用一份副本 |
| **懒加载** | 第一次 Task 访问时才拉取广播数据 |
| **释放内存** | 使用完调用 `unpersist()` 释放内存，`destroy()` 彻底销毁 |

#### 使用场景

- 大维表小表 join（广播小表实现 Map 端 Join）
- 全局配置、黑白名单、字典映射

#### 代码示例（Scala）

```scala
val map = Map(1 -> "北京", 2 -> "上海")
// Driver端广播
val bcMap = sc.broadcast(map)

rdd.map(x => {
  // Task中通过value获取广播变量，只读
  bcMap.value.getOrElse(x, "未知")
})

// 不用时释放
bcMap.unpersist()
```

#### 使用时机

| 场景 | 建议 |
|------|------|
| 数据量几十 MB ~ 几百 MB 的小表、字典 | ✅ 适合广播 |
| 几 GB 超大数据 | ❌ 不适合，容易造成 Executor 内存溢出 |

### 13.3 累加器 vs 广播变量 对比

| 特性 | 累加器（Accumulator） | 广播变量（Broadcast） |
|------|----------------------|----------------------|
| **读写权限** | Task 只写累加，Driver 可读 | 全局只读，任何节点不能修改 |
| **数据流向** | Task → Driver（聚合汇总） | Driver → Executor（下发分发） |
| **使用目的** | 全局计数、求和、统计 | 共享大只读数据集，减少传输 |
| **使用位置** | foreach、map 等算子做统计 | join、数据映射、规则匹配 |
| **数据大小** | 通常很小（数值） | 可以是较大的集合、Map |

### 13.4 补充知识点

#### 自定义累加器

可以继承 `AccumulatorV2` 实现集合累加、对象统计，用来收集异常数据、错误日志。

#### 广播变量实现 MapJoin

大表 join 小表最优方案：将小表广播到所有 Executor，大表在 Map 阶段直接做本地匹配，省去 Shuffle 阶段，性能极大提升。

#### 共享变量原理总结

| 变量类型 | 说明 |
|----------|------|
| **普通局部变量** | 每个 Task 独立副本，无法共享更新 |
| **累加器** | Executor 聚合结果回传到 Driver，适合全局统计 |
| **广播变量** | Driver 下发只读副本到 Executor，适合全局只读数据共享 |

---
*最后更新: 2025-06-26*
