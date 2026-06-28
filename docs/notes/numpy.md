# NumPy 笔记

## 一、创建数组

```python
import numpy as np

# 从列表创建
arr = np.array([1, 2, 3, 4])
arr = np.array([[1, 2], [3, 4]])  # 二维

# 指定类型
arr = np.array([1, 2, 3], dtype=np.float32)

# 快捷创建
np.zeros((3, 4))          # 全0矩阵
np.ones((3, 4))           # 全1矩阵
np.eye(3)                 # 单位矩阵
np.full((3, 4), 7)        # 全7矩阵
np.empty((3, 4))          # 未初始化（随机值）

# 序列
np.arange(0, 10, 2)       # array([0, 2, 4, 6, 8])
np.linspace(0, 1, 5)      # array([0., 0.25, 0.5, 0.75, 1.])

# 随机
np.random.seed(42)                     # 固定随机种子
np.random.rand(3, 2)                   # [0, 1) 均匀分布
np.random.randn(3, 2)                  # 标准正态分布
np.random.randint(0, 10, size=(3, 2))  # 随机整数
np.random.choice(arr, size=5, replace=False)  # 随机抽样
```

---

## 二、数组属性

```python
arr.shape        # (3, 4) 形状
arr.ndim         # 2 维度数
arr.size         # 12 元素总数
arr.dtype        # int32 数据类型
arr.itemsize     # 4 每个元素字节数
arr.nbytes       # 48 总字节数
```

---

## 三、索引与切片

```python
# 一维（同 Python 列表）
arr[0]
arr[2:5]
arr[::-1]        # 反转

# 二维
arr[0, 1]        # 第0行第1列
arr[0]           # 第0行
arr[:, 1]        # 第1列
arr[0:2, 1:3]    # 前2行，第1-2列

# 布尔索引
arr[arr > 5]                   # 筛选大于5的元素
arr[(arr > 2) & (arr < 8)]     # 多条件用 & | ~
arr[np.isnan(arr)] = 0         # NaN 替换

# 花式索引（Fancy Indexing）
arr[[0, 2, 4]]                 # 按位置选行
arr[[0, -1]]                   # 第一行和最后一行
arr[:, [0, -1]]                # 第一列和最后一列
```

---

## 四、形状变换

```python
arr.reshape(2, 6)          # 改为2行6列
arr.reshape(-1, 1)         # 自动计算行数，1列
arr.ravel()                # 展平为一维（返回视图）
arr.flatten()              # 展平为一维（返回副本）

arr.T                      # 转置
arr.transpose(1, 0)        # 指定轴顺序转置

np.expand_dims(arr, axis=0)     # 增加维度
np.expand_dims(arr, axis=-1)    # 在末尾加维度
np.squeeze(arr)                 # 去掉长度为1的维度

np.vstack([a, b])           # 纵向堆叠
np.hstack([a, b])           # 横向堆叠
np.concatenate([a, b], axis=0)  # 沿指定轴拼接
np.split(arr, 3)            # 分割成3份
```

---

## 五、数学运算

### 基本运算（逐元素 / 向量化）

```python
arr + 2
arr - 1
arr * 3
arr / 2
arr ** 2           # 平方
arr % 3
arr1 + arr2        # 对应位置相加（shape 需一致或广播）
np.sqrt(arr)
np.exp(arr)
np.log(arr)
np.abs(arr)
np.round(arr, 2)
np.clip(arr, 0, 100)  # 裁剪到 [0, 100]
```

### 聚合函数

```python
arr.sum()
arr.mean()
arr.std()           # 标准差
arr.var()           # 方差
arr.min()
arr.max()
arr.argmin()        # 最小值位置
arr.argmax()        # 最大值位置
arr.median()
np.percentile(arr, 50)  # 中位数
np.percentile(arr, [25, 50, 75])  # 四分位数

# 指定轴
arr.sum(axis=0)     # 每列求和（沿行方向）
arr.sum(axis=1)     # 每行求和（沿列方向）
```

---

## 六、广播（Broadcasting）

对不同形状的数组自动对齐运算。

```python
# 规则：从后往前比较维度，兼容当维度相等或其中一个为1
a = np.array([[1,2,3], [4,5,6]])  # (2, 3)
b = np.array([10, 20, 30])        # (3,)
a + b   # (2, 3) + (3,) → 每行自动加 b

c = np.array([[1], [2]])          # (2, 1)
a + c   # (2, 3) + (2, 1) → 每列自动加 c

# 手动扩展
np.broadcast_to(b, (2, 3))
```

---

## 七、线性代数

```python
np.dot(a, b)              # 点积
a @ b                     # 矩阵乘法（推荐写法）

np.linalg.inv(arr)        # 逆矩阵
np.linalg.det(arr)        # 行列式
np.linalg.eig(arr)        # 特征值 + 特征向量
np.linalg.norm(arr)       # 范数
np.linalg.svd(arr)        # 奇异值分解

# 求解 Ax = b
x = np.linalg.solve(A, b)
```

---

## 八、统计与排序

```python
# 排序
np.sort(arr)                    # 返回排序后副本
np.sort(arr, axis=0)            # 按列排序
np.argsort(arr)                 # 返回排序后的索引

# 唯一值
np.unique(arr)                  # 去重并排序
np.unique(arr, return_counts=True)  # 返回值和计数

# 条件
np.where(arr > 5, arr, 0)       # 三元：条件为真保留，否则0
np.where(arr > 5)               # 返回满足条件的索引

# 统计
np.corrcoef(x, y)               # 相关系数矩阵
np.histogram(arr, bins=10)      # 直方图
np.bincount(arr)                # 非负整数计数（比value_counts快）
```

---

## 九、常用函数速查

```python
np.isnan(arr)            # 判断 NaN
np.isinf(arr)            # 判断无穷
np.isclose(a, b)         # 近似相等（避免浮点误差）

np.ceil(arr)             # 向上取整
np.floor(arr)            # 向下取整
np.modf(arr)             # 分离整数和小数部分

np.concatenate([a, b])   # 拼接
np.repeat(arr, 3)        # 重复每个元素
np.tile(arr, (2, 3))     # 重复整个数组
np.pad(arr, ((1,1),(2,2)), mode='constant')  # 填充

np.any(arr > 0)          # 任一为真
np.all(arr > 0)          # 全部为真

# 聚合多模式
np.mean(arr, axis=1, keepdims=True)  # keepdims 保持维度不降
```

---

## 十、数据类型转换

```python
arr.astype(np.float32)
arr.astype(np.int64)
arr.astype(np.bool_)

# NumPy ↔ Pandas
df.values             # DataFrame → ndarray
np_arr.tolist()       # ndarray → list
```

---

## 十一、向量化实战

```python
# ❌ 慢：Python 循环
result = []
for x in range(1000000):
    result.append(x ** 2 + x * 3 + 1)

# ✅ 快：NumPy 向量化
x = np.arange(1000000)
result = x ** 2 + x * 3 + 1

# ✅ 用 where 替代 if-else 循环
arr = np.random.randn(1000000)
arr = np.where(arr > 0, arr, 0)
```

---
*最后更新: 2025-06-23*
