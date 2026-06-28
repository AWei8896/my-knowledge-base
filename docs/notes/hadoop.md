# Hadoop 笔记

## 一、概述

Hadoop 是 Apache 开源的**分布式大数据处理框架**，解决单机无法处理的 PB 级数据存储与计算问题。由 Doug Cutting 创建，灵感源自 Google 三篇论文（GFS、MapReduce、BigTable）。

---

## 二、核心设计思想

### 2.1 分而治之

将大数据切分为小数据块，分配到集群多台机器上并行处理，最后汇总结果。

### 2.2 移动计算，而非移动数据

数据存储在哪个节点，计算任务就发送到哪个节点执行。避免大量数据在网络传输，减少带宽瓶颈。

### 2.3 故障容忍

默认为每个数据块存 3 份副本。节点宕机时，自动从副本恢复，计算任务重新调度。

### 2.4 一次写入，多次读取

HDFS 设计为 Write-Once-Read-Many 模型。文件写入后不可修改（只能追加），简化并发控制，适合批处理。

### 2.5 用廉价硬件构建可靠系统

不需要昂贵的小型机/存储阵列，用普通 PC 服务器即可。通过软件层面的副本机制和容错保证可靠性。

---

## 三、三大核心组件

### 组件总览

| 组件 | 解决什么问题 | 角色 | 适用场景 |
|------|-------------|------|----------|
| **HDFS** | 大数据如何**存储**（单机存不下） | 分布式文件系统 | 大文件（GB~TB）、一次写入多次读取、高吞吐、高容错 |
| **MapReduce** | 大数据如何**计算**（单机算不动） | 分布式计算框架 | 离线批处理（ETL、日志分析、数据汇总），不适合低延迟 |
| **YARN** | 集群资源如何**分配**（多应用争抢资源） | 资源管理与调度 | 统一管理 CPU/内存，让 MR、Spark、Flink 共享同一集群 |

### 三者关系

```
YARN（老板）  →  管理集群资源，谁要用先申请
  ├── 给 MapReduce（员工A）分配资源 → 在 HDFS 的数据上做计算
  ├── 给 Spark（员工B）   分配资源 → 在 HDFS 的数据上做计算
  └── 给 Flink（员工C）   分配资源 → 在 HDFS 的数据上做计算

HDFS（仓库）  →  存数据，MapReduce/Spark 都从仓库取数据，结果也写回仓库
```

---

## 四、HDFS（Hadoop Distributed File System）

### 核心定位

**HDFS 解决大数据如何存储的问题**。单台服务器硬盘有上限（比如 10TB），而实际数据可能是 1PB（1000 台 × 10TB）。HDFS 把超大文件切成 Block，分散存到集群所有机器上，对外看起来像一个文件系统。

**分布式存储的优点：**

| 优点 | 说明 |
|------|------|
| **突破单机容量** | 原来一台机器最多存 10TB，1000 台就能存 10PB |
| **高吞吐** | 从多台机器同时读/写，带宽叠加（1000 台 × 100MB/s ≈ 100GB/s） |
| **高容错** | 每块存 3 副本，机器挂了数据不丢，自动从其他副本恢复 |
| **线性扩展** | 加新机器 → 容量和吞吐自动提升，无需停机 |
| **成本低** | 普通 PC 服务器就行，不需要昂贵的专用存储设备 |

**适用场景：**
- 大文件（GB~TB 级别），小文件多会导致 NameNode 内存压力
- 一次写入，多次读取（批处理场景，不支持文件随机修改）
- 高吞吐优先（带宽优先，而非低延迟）
- 高容错需求（机器挂了数据不丢，自动恢复）

### 4.1 架构

```
                       ┌──────────┐
                       │  Client  │  读写请求
                       └────┬─────┘
                            │
           ┌────────────────┼──────────────┐
           │ 元数据操作      │              │ 数据块读写
           ▼                │              ▼
    ┌────────────┐          │       ┌────────────┐
    │ NameNode   │(主节点)   │      │ DataNode    │(从节点 × N)
    │ 管理元数据  │          │      │ 存储数据块   │
    │ 维护目录树  │          │      │ 定期心跳汇报 │
    └────┬───────┘          │       └─────────────┘
         │                  │
         ▼                  │
    ┌───────────┐           │
    │ Secondary │           │
    │ NameNode  │ 同步FSImage/EditLog，辅助恢复，并非热备
    └───────────┘
```

### 4.2 核心概念

**数据块（Block）**
- 默认 128MB（Hadoop 2.x+，1.x 为 64MB）
- 大文件切成多个块，分散存储在不同 DataNode 上
- 每个块默认 3 副本（可配置），分布在不同机架

**NameNode（NN）**
- 主节点，管理文件系统的命名空间（目录树）
- 维护文件 → 块 → DataNode 的映射关系（元数据）
- 元数据常驻内存，因此 NameNode 需要较大内存
- 单点故障（HA 配置需 JournalNode + ZK）

**DataNode（DN）**
- 从节点，真正存储数据块
- 定期向 NameNode 发送心跳（默认 3s）和块报告（默认 6h）
- 超过 10 分钟没收到心跳，NameNode 认为该节点挂掉

**Secondary NameNode（SNN）**
- 不是 NameNode 的热备，不能直接接管
- 定期合并 FSImage（快照）和 EditLog（操作日志），防止 EditLog 过大

**机架感知（Rack Awareness）**
- 副本放置策略：第一个副本在本机架，第二个在同机架不同节点，第三个在不同机架
- 防止机架级故障导致数据全部丢失，同时兼顾网络效率

### 4.3 读写流程

**写流程**
1. Client 向 NameNode 请求创建文件
2. NameNode 检查权限和目录是否存在
3. Client 将数据写入第一个 DataNode
4. DataNode 间形成 Pipeline，逐级复制副本
5. 所有副本写完，返回成功

**读流程**
1. Client 向 NameNode 请求读取文件
2. NameNode 返回文件块位置列表（按距离排序，就近原则）
3. Client 从最近的 DataNode 读取数据块

### 4.4 HDFS 常用命令

```bash
# 文件操作
hdfs dfs -ls /                           # 列出根目录
hdfs dfs -mkdir /user/data               # 创建目录（-p 递归创建）
hdfs dfs -put local.txt /user/data/      # 上传文件
hdfs dfs -get /user/data/file.txt ./     # 下载文件
hdfs dfs -cat /user/data/file.txt        # 查看文件内容（小文件用）
hdfs dfs -tail /user/data/file.txt       # 查看文件末尾
hdfs dfs -rm /user/data/file.txt         # 删除文件
hdfs dfs -rm -r /user/data/              # 递归删除目录
hdfs dfs -mv /src /dst                   # 移动/重命名
hdfs dfs -cp /src /dst                   # 复制
hdfs dfs -du -h /user/data/              # 查看目录大小
hdfs dfs -count /user/data/              # 统计文件数和大小

# 管理命令
hdfs fsck / -files -blocks               # 检查文件系统健康状态
hdfs dfsadmin -report                    # 查看集群报告（DataNode状态、容量等）
hdfs dfsadmin -safemode leave            # 离开安全模式
hdfs namenode -format                    # 格式化 NameNode（首次部署）
```

---

## 五、MapReduce

### 核心定位

**MapReduce 解决大数据如何计算的问题**。数据分布在 1000 台机器上，传统方式需要把数据全部拉到一台机器再算，网络带宽和单机内存都扛不住。MapReduce 将计算任务分发到每台存有数据的机器上本地执行（移动计算，不移动数据），各自算完局部结果，最后汇总。

**适用场景：**

| 场景 | 示例 |
|------|------|
| 离线日志分析 | 每天 10TB 的访问日志，统计 PV/UV |
| ETL 数据清洗 | 从原始日志提取、转换、加载到数据仓库 |
| 数据汇总 | 海量订单按日/按地区做聚合统计 |
| 索引构建 | 为搜索引擎构建倒排索引 |
| 大规模排序 | 对 TB 级数据全排序 |

**不适用场景：** 实时查询（用 HBase）、交互式分析（用 Hive/Impala）、迭代计算（用 Spark）、流处理（用 Flink）。

### 5.1 设计思想

分而治之：大批量数据 → 切分为独立小任务 → 多节点并行计算 → 结果汇总。

### 5.2 执行流程

```
Input → Map → Shuffle & Sort → Reduce → Output

 切分      映射      洗牌排序        归约      输出
```

**阶段详解：**

| 阶段 | 做什么 | 示例（WordCount） |
|------|--------|-------------------|
| **Input Split** | 将输入文件切分为多个分片（Split），每个 Split → 一个 Map Task | 按行切分文本 |
| **Map** | 读取 Split，按行处理，输出 (k, v) 中间键值对 | (word, 1) |
| **Shuffle & Sort** | 将 Map 输出的中间结果按 key 分区、排序、分组 | 相同 word 的 (word,1) 汇聚到一起 |
| **Reduce** | 对每个 key 的分组 values 做聚合 | 对每个 word 的 [1,1,1] 求和 |
| **Output** | 将 Reduce 结果写入 HDFS | (word, count) |

### 5.3 WordCount 代码

```python
# Python 版 MapReduce WordCount
# mapper.py
import sys
for line in sys.stdin:
    words = line.strip().split()
    for word in words:
        print(f"{word}\t1")

# reducer.py
import sys
current_word = None
current_count = 0
for line in sys.stdin:
    word, count = line.strip().split("\t")
    count = int(count)
    if word == current_word:
        current_count += count
    else:
        if current_word:
            print(f"{current_word}\t{current_count}")
        current_word = word
        current_count = count
if current_word:
    print(f"{current_word}\t{current_count}")

# 运行
# hadoop jar hadoop-streaming.jar \
#   -input /input/text.txt \
#   -output /output/wordcount \
#   -mapper "python mapper.py" \
#   -reducer "python reducer.py"
```

### 5.4 Shuffle 详解

Shuffle 是 MapReduce 的核心，也是最耗时的阶段。

```
Map端:
  Map输出 → 环形缓冲区(100MB) → 达到80%阈值 → Spill到磁盘 → 分区+排序
  → 多个spill文件 → Merge合并 → 最终Map输出文件

Reduce端:
  Copy阶段 → 拉取Map端对应分区的数据
  Merge阶段 → 合并来自多个Map的数据
  Sort阶段  → 按key排序 → 分组(group) → 传给Reduce函数
```

**优化点**：Map 端预合并（Combiner）、适当增大缓冲区、使用压缩减少传输量。

---

## 六、YARN（Yet Another Resource Negotiator）

### 核心定位

**YARN 解决集群资源如何分配的问题**。一个集群 100 台机器，同时跑着 MR 任务、Spark 任务、Flink 任务，谁用多少 CPU/内存？YARN 就是集群的"总调度"，统一管理所有机器的 CPU 和内存，按需分配给各个应用。

**Hadoop 1.x 没有 YARN 时**，MapReduce 既管计算也管资源调度——强耦合，其他计算框架（Spark）无法接入 Hadoop 集群。**YARN 出现后**，资源管理独立出来，Spark、Flink、Storm 等都能跑在 YARN 上，共享同一集群。

**适用场景：**

| 场景 | 说明 |
|------|------|
| 多租户共享集群 | 多个部门同时跑任务，YARN 按队列分配资源，互不影响 |
| 多计算框架混跑 | MapReduce、Spark、Flink 共用一个集群，提升资源利用率 |
| 任务优先级管理 | 重要任务放入高优先级队列，优先分配资源 |
| 弹性资源调度 | 空闲资源自动分配给需要的任务，用完回收 |

### 核心优势

| 优势 | 说明 |
|------|------|
| **资源统一管理** | 不再每个框架单独管资源，全部由 YARN 统一调度，集群资源全局可见、统一分配 |
| **支持多种计算框架** | MapReduce、Spark、Flink、Storm、Tez 等都能跑在 YARN 上，只需实现 YARN 接口即可接入 |
| **共享集群资源** | 一个集群同时运行多种框架的任务，不用为每个框架单独搭集群，节省硬件成本 |
| **提高资源利用率** | 共享模式下资源按需分配，任务多时弹性扩容、任务少时资源回收，避免各自建集群的碎片化浪费 |
| **多租户隔离** | 按队列划分资源，部门 A 和部门 B 互不影响，重要任务保证资源，不怕被挤占 |
| **弹性伸缩** | 支持动态扩容/缩容，新增 NodeManager 即可加入集群，下线时自动迁移任务 |
| **兼容性好** | Hadoop 2.x+ 原生内置，与 HDFS 深度集成，无需额外部署，社区成熟稳定 |

### 6.1 架构

```
           ┌─────────────────────────────┐
           │          Client             │  提交应用
           └─────────────┬───────────────┘
                         │
           ┌─────────────▼───────────────┐
           │       ResourceManager       │  (主节点)
           │  ┌─────────┐ ┌───────────┐  │
           │  │Scheduler│ │Application│  │
           │  │ 纯调度   │ │  Manager │  │
           │  └─────────┘ └───────────┘  │
           └─────────────┬───────────────┘
                 心跳/汇报│
           ┌─────────────┼────────────────┐
           │        NodeManager × N       │  (从节点)
           │   ┌──────────┐               │
           │   │ Container│  ┌──────────┐ │
           │   │(CPU+内存)│  │Container │ │
           │   │Map Task  │  │ReduceTask│ │
           │   └──────────┘  └──────────┘ │
           └──────────────────────────────┘
```

### 6.2 核心组件

| 组件 | 层级 | 职责 |
|------|:---:|------|
| **ResourceManager（RM）** | 集群级 | 全局资源大管家，接收应用请求，根据调度策略分配资源。每集群一个（HA 可两个） |
| **NodeManager（NM）** | 节点级 | 每台机器一个，监控本机 CPU/内存/磁盘，向 RM 定期心跳汇报，启动和停止 Container |
| **ApplicationMaster（AM）** | 应用级 | 每个应用一个，向 RM 申请资源，与 NM 配合在 Container 里启动 Task，跟踪执行状态和失败重试 |
| **Container** | 任务级 | **资源分配的最小单位**，封装了一定量的 CPU + 内存，Task 在 Container 里运行。RM 只分配 Container，不直接管 Task |

**四者关系用一句话理解：**

> RM 是总经理（管全局资源），NM 是各分厂厂长（管本机资源），AM 是项目经理（为本项目申请资源），Container 是工位（项目经理申请到工位后派员工 Task 坐上去干活）。

### ApplicationMaster 详解

**"每个应用一个"** — 你每提交一个计算任务（一个 MapReduce Job、一个 Spark 应用、一个 Flink 作业），YARN 就为这个应用单独启动一个 AM。举例如下：

```
同时提交 3 个 MR Job：
  Job_001  →  AM_1（管 20 个 Map Task + 5 个 Reduce Task）
  Job_002  →  AM_2（管 15 个 Map Task + 3 个 Reduce Task）
  Job_003  →  AM_3（管 30 个 Map Task + 10 个 Reduce Task）
  三个 AM 各自独立运行，互不干扰
```

**"向 RM 申请资源"** — AM 并不直接占有集群资源，它需要向 RM 申请 Container。流程是：

```
AM:  "我要启动 10 个 Map Task，每个需要 2G 内存 + 1 核"
RM:  "集群现在有空闲，给你 5 个 Container"（根据调度策略分配）
AM:  "收到，我再申请剩下的 5 个"
RM:  "有节点释放资源了，再给你 3 个"
...
AM:  "Container 全拿到了，全部 Task 启动完成"
```

RM 只负责**分配 Container 给 AM**，RM 不会直接管 Task。AM 拿到 Container 后自己去对应的 NM 上启动 Task、监控进度、处理失败重试。

**AM 完整职责：**

| 职责 | 具体做什么 |
|------|-----------|
| **申请资源** | 根据任务数量（如 MR 的 Map/Reduce 个数），向 RM 申请对应数量的 Container |
| **启动 Task** | 拿到 Container 后，与对应节点的 NM 通信，在 Container 里启动 Map/Reduce Task |
| **监控进度** | 跟踪每个 Task 的执行状态（运行中/完成/失败） |
| **失败重试** | Task 失败了自动重试（默认重试 4 次），某个节点挂了就把 Task 调度到其他节点 |
| **释放资源** | 所有 Task 执行完毕，通知 RM 释放 Container，AM 自己也退出 |

如果 AM 自己挂了怎么办？RM 会重新启动一个 AM（默认重试 2 次），从上次的进度继续。但 AM 的健康不影响数据的完整性——数据在 HDFS 有 3 副本，AM 只管调度。

### 6.3 资源调度器（Scheduler）

调度器决定"谁来用资源、用多少"。YARN 提供三种调度器，在 `yarn-site.xml` 中配置。

#### FIFO Scheduler（先进先出）

```
  任务队列：[ Job1 ] → [ Job2 ] → [ Job3 ]
  资源分配：Job1 先到，占满所有资源，Job2/3 排队等
```

- 实现最简单，按提交顺序一个接一个执行
- **问题**：前面的长任务会堵死后面所有任务
- **适用**：仅用于测试，生产环境基本不用

#### Capacity Scheduler（容量调度器）← 默认

```
  ┌───────────────────────────────────┐
  │  集群总资源 100%                   │
  ├──────────────┬────────────────────┤
  │ 队列A: 60%   │  队列B: 40%         │
  │ ┌──────────┐ │  ┌──────────────┐  │
  │ │ Job1 Job2│ │  │ Job3   Job4  │  │
  │ │ FIFO     │ │  │ FIFO         │  │
  │ └──────────┘ │  └──────────────┘  │
  └──────────────┴────────────────────┘
```

- 多队列，每队列分配资源占比（如 A 60%、B 40%），队列内 FIFO
- **弹性**：队列 A 空闲时，队列 B 可临时借用 A 的资源，A 有任务时归还
- **安全**：每个队列有最小资源保底，不会被其他队列挤占
- **适用**：多部门共享集群，需要隔离和优先级保障

```xml
<!-- yarn-site.xml Capacity Scheduler 示例 -->
<property>
  <name>yarn.resourcemanager.scheduler.class</name>
  <value>org.apache.hadoop.yarn.server.resourcemanager.scheduler.capacity.CapacityScheduler</value>
</property>

<!-- 队列配置 capacity-scheduler.xml -->
<!-- root.queues=prod,dev              prod占70%, dev占30%
     root.prod.capacity=70
     root.dev.capacity=30
     root.prod.maximum-capacity=100    prod空闲可借到100%
     root.dev.minimum-capacity=20      dev至少保证20% -->
```

#### Fair Scheduler（公平调度器）

```
  时间1：仅 Job1     →     时间2：Job2 加入     →     时间3：Job1 结束
  ┌───────────┐          ┌─────────┬─────────┐      ┌───────────────┐
  │  Job1     │          │  Job1   │  Job2   │      │     Job2      │
  │  100%资源 │          │  50%    │  50%    │      │   100%资源    │
  └───────────┘          └─────────┴─────────┘      └───────────────┘
```

- 动态公平分配，新任务进来时从已有任务匀出资源，保证活跃任务大致平均
- 任务完成后资源立即回收，重新分配给其他任务
- 支持**权重**：权重高的任务分到更多资源
- 支持**最小资源**：关键队列保证最低配额
- **适用**：任务量波动大、追求公平和资源最大化利用的场景

```xml
<!-- yarn-site.xml Fair Scheduler 示例 -->
<property>
  <name>yarn.resourcemanager.scheduler.class</name>
  <value>org.apache.hadoop.yarn.server.resourcemanager.scheduler.fair.FairScheduler</value>
</property>

<!-- fair-scheduler.xml -->
<!--
  <queue name="critical">
    <minResources>20480 mb, 10 vcores</minResources>   最少资源保底
    <weight>2.0</weight>                                权重2倍，多分资源
  </queue>
  <queue name="normal">
    <minResources>10240 mb, 5 vcores</minResources>
    <weight>1.0</weight>
  </queue>
-->
```

#### 三种调度器对比

| 维度 | FIFO | Capacity | Fair |
|------|:----:|:--------:|:----:|
| 复杂度 | 最简单 | 中等 | 较复杂 |
| 资源隔离 | 无 | 队列级别 | 队列内任务级别 |
| 弹性 | 无 | 队列间可借用 | 实时动态调整 |
| 多租户 | 不支持 | 支持（队列 + 最小容量） | 支持（队列 + 权重） |
| 适用 | 仅测试 | 多部门共享集群 | 任务波动大、追求公平 |
| Hadoop 默认 | 否（1.x 是） | **是（2.x+ 默认）** | 否 |

### 6.3.1 调度器对比图例

```
FIFO:
  |████████████████  Job1（长任务）██████████████████| Job2阻塞 | Job3阻塞 → 时间

Capacity:
  ┌─ 队列A 60% ────┐┌─ 队列B 40% ──┐
  |████ Job1 ███████││████ Job3 ████│  Job2在A内排队
  └────────────────┘└──────────────┘  Job4在B内排队

Fair:
  |██████ Job1 █████|██████ Job2 █████|██████ Job1 █████|███ Job2 ███| 可以交替执行
```

### 6.4 Job 提交流程

```
1. Client 向 RM 提交应用
2. RM 分配第一个 Container → 启动 AM
3. AM 向 RM 注册，申请资源
4. AM 和 NM 通信，在 Container 中启动 Map/Reduce Task
5. Task 执行完成，AM 向 RM 注销
6. Client 获取执行结果
```

---

## 七、Hadoop 生态圈

| 组件 | 作用 | 替代/增强 |
|------|------|-----------|
| **Hive** | SQL on Hadoop，将 SQL 翻译为 MapReduce | 数仓查询 |
| **Spark** | 内存计算引擎，比 MR 快 10~100 倍 | MapReduce 替代 |
| **HBase** | 列式 NoSQL 数据库，基于 HDFS | 实时读写 |
| **Kafka** | 消息队列 | 数据接入 |
| **ZooKeeper** | 分布式协调服务 | 集群一致性 |
| **Flume** | 日志采集 | 数据收集 |
| **Sqoop** | 数据迁移（Hadoop ↔ 关系数据库） | 数据导入导出 |

---

## 八、核心优势与局限性

### 核心优势

| 优势 | 说明 |
|------|------|
| **高可靠性** | 多副本机制（默认3份），自动容错，数据不丢失 |
| **高扩展性** | 可扩展到数千节点，支持 PB 甚至 EB 级数据 |
| **高容错性** | 自动检测节点故障，自动重调度失败任务 |
| **成本低** | 使用廉价 PC 服务器，开源免费 |
| **适合批处理** | 高吞吐量，适合大规模离线数据处理 |
| **数据本地性** | 计算靠近数据，减少网络传输 |

### 局限性

| 不足 | 说明 | 解决方案 |
|------|------|----------|
| **不适合实时** | MapReduce 是批处理，延迟高 | Spark Streaming / Flink |
| **不适合迭代** | 每轮 MR 都读写 HDFS，效率低 | Spark（内存迭代） |
| **小文件问题** | 小文件过多 NameNode 内存爆炸 | HAR 归档、SequenceFile 合并 |
| **MapReduce 编程繁琐** | 一个简单任务也要写 MR 代码 | Hive SQL / Spark DF |

---

## 九、HDFS 架构补充：联邦与高可用

### 9.1 NameNode HA（高可用）

```
┌──────────────┐        ┌──────────────┐
│  NameNode    │◄──────►│  NameNode    │
│  (Active)    │Failover│ (Standby)    │
└──────┬───────┘        └──────┬───────┘
       │ 写入EditLog           │ 读取EditLog同步
       ▼                       ▼
┌──────────────────────────────────┐
│        JournalNode 集群(奇数)     │  共享元数据存储
└──────────────────────────────────┘
                              ▲
         ┌────────────────────┘
         │ ZooKeeper 做自动故障转移
```

- Active NN 负责处理所有读写请求
- Standby NN 同步 EditLog，随时准备接管
- JournalNode 集群（通常 3 台）存储共享 EditLog
- ZooKeeper 监控 NN 健康，实现自动故障转移

### 9.2 HDFS 联邦（Federation）

当单 NameNode 内存成为瓶颈时，通过联邦扩展：

```
┌───────────┐  ┌───────────┐  ┌───────────┐
│ NameNode1 │  │ NameNode2 │  │ NameNode3 │  各自管理不同命名空间
│ /user     │  │ /data     │  │ /project  │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      └──────────────┼─────────────┘
                     ▼
              ┌──────────────┐
              │ 所有 DataNode│  存储池共享
              └──────────────┘
```

- 多个 NameNode 共同管理，每个管一部分目录
- DataNode 池共享，减少单 NameNode 压力

---
*最后更新: 2025-06-23*
