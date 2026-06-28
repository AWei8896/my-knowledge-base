# Python 数据处理速查笔记

> 内置函数 + Pandas · 面试/笔试/日常快速查阅

---

## 一、Python 内置常用数据处理函数

> 纯基础，无需第三方库，所有数据分析的底层操作都从这里开始

### 1. 通用统计函数

**`len()` — 获取元素个数**

```python
lst = [1, 2, 3]
len(lst)  # 3
```

**`max()` — 求最大值**

```python
max([1, 5, 3])  # 5
```

**`min()` — 求最小值**

```python
min([1, 5, 3])  # 1
```

**`sum()` — 数值序列求和**

```python
sum([1, 2, 3])  # 6
```

**`sorted()` — 排序，返回新列表**

```python
sorted([3, 1, 2])            # [1, 2, 3]
sorted([3, 1, 2], reverse=True)  # 降序
```

> 💡 `sorted()` 返回新列表，不改变原列表；`list.sort()` 是原地排序，直接修改原列表。

### 2. 类型转换函数

以下函数用于不同数据结构之间的互相转换，是 ETL 中最基础的环节：

```python
list(可迭代对象)      # 转列表
tuple(可迭代对象)     # 转元组
set(可迭代对象)       # 转集合（自动去重）
dict(可迭代对象)      # 转字典
int() / float() / str()  # 基础类型转换
```

> 💡 `set()` 去重是最常用的场景：`set([1, 1, 2, 3])` → `{1, 2, 3}`

### 3. 序列处理高阶函数

**`map()` — 对序列中每个元素执行相同操作**

```python
lst = [1, 2, 3]
res = list(map(lambda x: x * 2, lst))
# [2, 4, 6]
```

**`filter()` — 根据条件过滤，只保留 `True` 的元素**

```python
res = list(filter(lambda x: x > 1, [1, 2, 3]))
# [2, 3]
```

**`zip()` — 多个序列按位置打包配对**

```python
a = [1, 2]
b = ['x', 'y']
list(zip(a, b))  # [(1, 'x'), (2, 'y')]
```

> 💡 `zip()` 在联合遍历时非常实用：`for name, score in zip(names, scores)`

**`enumerate()` — 遍历时同时获取下标与值**

```python
for idx, val in enumerate([10, 20]):
    print(idx, val)
# 0 10
# 1 20
```

### 4. 列表常用方法

以下方法在数据清洗和特征工程中使用频率最高：

```python
lst.append(x)        # 末尾添加元素
lst.extend(iter)     # 批量追加序列
lst.insert(index, x) # 指定位置插入
lst.pop(index)       # 删除并返回该位置元素
lst.remove(x)        # 删除第一个匹配元素
lst.reverse()        # 原地反转
lst.sort()           # 原地排序
lst.count(x)         # 统计元素出现次数
lst.index(x)         # 获取元素首次下标
```

> ⚠ `append()` vs `extend()`：`lst.append([4,5])` 加入整个列表为一个元素；`lst.extend([4,5])` 逐个加入。

### 5. 字符串数据清洗

```python
s.strip()                     # 去除首尾空格/换行
s.replace(old, new)           # 替换字符
s.split(sep)                  # 按分隔符切割成列表
'分隔符'.join(列表)            # 列表拼接为字符串
s.startswith('xxx')           # 判断首字符
s.endswith('xxx')             # 判断尾字符
```

> 💡 `split()` + `join()` 是字符串处理中最常用的组合：先用 `split` 拆开处理，再用 `join` 拼回。

### 6. 字典常用处理

```python
dict.keys()                 # 获取所有键
dict.values()               # 获取所有值
dict.items()                # 获取所有键值对
dict.get(key, 默认值)        # 安全取值，不存在返回默认值
dict.pop(key)               # 删除键并返回其值
```

> 💡 推荐使用 `dict.get()` 而非直接 `dict[key]`，避免 `KeyError` 中断程序。

---

## 二、Pandas 常用数据处理函数

> 表格类数据处理核心库 · `import pandas as pd`

### 1. 读取与保存

```python
pd.read_csv("文件.csv")                      # 读取 CSV
df.to_csv("保存.csv", index=False)            # 保存（不保存行索引）
```

> 💡 `index=False` 避免保存时多出一列无用的行号。

### 2. 基础查看

拿到数据后第一件事永远是三板斧：

```python
df.head(5)         # 前 5 行
df.tail()           # 后几行
df.info()           # 数据类型 + 缺失值 + 内存占用
df.describe()       # 统计：均值、最大/最小、标准差
df.columns          # 所有列名
df.shape            # (行数, 列数)
```

### 3. 缺失值处理

缺失值处理是数据清洗的核心环节：

```python
df.isnull()                # 判断每个值是否缺失
df.isnull().sum()          # 统计每列缺失数量
df.dropna()                # 删除含缺失值的行
df.fillna(0)               # 缺失值填充为 0
df.fillna(df['列'].mean())  # 用该列均值填充
```

> ⚠ **填值原则**：先理解缺失的业务含义再决定填什么。
> 例如：订单"距上一单天数"的首单缺失应填 `0`（无上一单），而非填均值；
> 而传感器温度的历史均值填充则适用于随机缺失。

### 4. 筛选、排序、去重

**条件筛选** — 类似 SQL 的 `WHERE`

```python
df[df['列'] > 100]
df[(df['A'] > 10) & (df['B'] == 'yes')]
```

**排序** — 类似 SQL 的 `ORDER BY`

```python
df.sort_values(by='列名', ascending=False)
```

**去重** — 类似 SQL 的 `DISTINCT`

```python
df.drop_duplicates()
df.drop_duplicates(subset=['用户ID'])  # 按指定列去重
```

> 💡 条件筛选用 `&`（与）和 `|`（或），注意每个条件要用括号括起来。

### 5. 分组聚合

数据分析最核心的操作，类似 SQL 的 `GROUP BY`：

```python
# 基本分组聚合
df.groupby('部门')['销售额'].sum()

# 多维度聚合（agg 一次做多种聚合）
df.groupby('用户ID').agg(
    购买次数=('订单ID', 'nunique'),
    总金额=('金额', 'sum'),
    平均金额=('金额', 'mean')
)

# 分组后排序
df.groupby('品类')['复购'].mean().sort_values(ascending=False)
```

> 💡 `agg()` 可以一次做多种聚合，相当于同时跑多条 SQL，大幅减少代码量。

### 6. 多表合并

类似 SQL 的 `JOIN`，是构建分析宽表的关键：

```python
# 左连接（最常用）
df1.merge(df2, on='主键', how='left')

# 多表链式连接
df = (订单明细
      .merge(订单表[['订单ID', '用户ID', '日期']], on='订单ID', how='left')
      .merge(商品表, on='商品ID', how='left'))
```

`how` 参数四种选择：

| 参数 | 含义 |
|------|------|
| `'left'` | 保留左表所有行（最常用） |
| `'inner'` | 两表交集 |
| `'right'` | 保留右表所有行 |
| `'outer'` | 两表并集 |

### 7. 透视表与窗口函数

**pivot_table — 数据透视**

```python
df.pivot_table(
    index='用户首购周',      # 行
    columns='活跃周',         # 列
    values='用户ID',          # 值
    aggfunc='nunique'         # 聚合方式
)
```

**cumsum — 累计求和（模拟 SQL 窗口函数）**

```python
df['累计天数'] = df.groupby('用户ID')['间隔天数'].cumsum()
```

> 💡 `cumsum()` + `groupby` 可以模拟 SQL 的 `SUM() OVER(PARTITION BY ... ORDER BY ...)` 效果。

---

*最后更新: 2025-06-28*
