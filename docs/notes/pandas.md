# Pandas 笔记

## 一、数据结构

Pandas 两大核心数据结构：**Series**（一维）和 **DataFrame**（二维）。

```python
import pandas as pd
import numpy as np

# Series
s = pd.Series([1, 3, 5, np.nan, 6])
s = pd.Series([1, 2, 3], index=['a', 'b', 'c'], name='数量')

# DataFrame
df = pd.DataFrame({
    '姓名': ['张三', '李四', '王五'],
    '年龄': [20, 21, 22],
    '成绩': [88.5, 92.0, 76.5]
})

# 从二维数组创建
df = pd.DataFrame(np.random.randn(5, 3), columns=['A', 'B', 'C'])
```

---

## 二、数据读取与写入

```python
# 读取
df = pd.read_csv('data.csv', encoding='utf-8')
df = pd.read_excel('data.xlsx', sheet_name='Sheet1')
df = pd.read_json('data.json')
df = pd.read_sql('SELECT * FROM table', conn)

# 写入
df.to_csv('output.csv', index=False, encoding='utf-8')
df.to_excel('output.xlsx', sheet_name='Sheet1', index=False)
df.to_json('output.json', orient='records', force_ascii=False)
```

---

## 三、数据查看

```python
df.head(10)        # 前10行
df.tail(5)         # 后5行
df.shape           # (行数, 列数)
df.info()          # 列类型、非空数量、内存占用
df.describe()      # 数值列统计（count/mean/std/min/25%/50%/75%/max）
df.columns         # 列名
df.index           # 行索引
df.dtypes          # 每列类型
df.values          # 转为 numpy 数组
```

---

## 四、选择与过滤

```python
# 选单列
df['姓名']
df.姓名               # 列名不含空格时可用

# 选多列
df[['姓名', '成绩']]

# loc：按标签（label）索引
df.loc[0]              # 第0行
df.loc[0:3]            # 切片（含右边界）
df.loc[0, '姓名']      # 单个值
df.loc[:, ['姓名','成绩']]  # 所有行的指定列

# iloc：按位置（position）索引
df.iloc[0]             # 第0行
df.iloc[0:3]           # 切片（不含右边界，同Python）
df.iloc[0, 1]          # 第0行第1列
df.iloc[:, :3]         # 所有行前3列

# 布尔过滤
df[df['成绩'] >= 80]
df[(df['成绩'] >= 80) & (df['年龄'] >= 20)]   # 条件用 & | ~
df[df['姓名'].isin(['张三', '李四'])]
df[df['姓名'].str.contains('张')]

# 单个条件赋值
df.loc[df['成绩'] < 60, '等级'] = '不及格'
```

---

## 五、增删改

```python
# 增加列
df['新列'] = df['成绩'] * 1.2
df.insert(1, '排名', range(1, len(df)+1))

# 增加行
df.loc[len(df)] = ['赵六', 23, 85.0]
df2 = pd.concat([df, new_rows], ignore_index=True)

# 删除列
df.drop('新列', axis=1, inplace=True)
df.drop(columns=['列1', '列2'], inplace=True)

# 删除行
df.drop(index=[0, 1], inplace=True)
df.drop(df[df['成绩'] < 60].index, inplace=True)

# 修改值
df.loc[0, '成绩'] = 95.0
df['年龄'] = df['年龄'].replace(20, 21)
```

---

## 六、缺失值处理

```python
df.isnull().sum()          # 每列缺失值数量
df.isnull().sum() / len(df) * 100  # 缺失比例

df.dropna()                # 删除含缺失值的行
df.dropna(axis=1)          # 删除含缺失值的列
df.dropna(subset=['姓名']) # 指定列缺失才删除

df.fillna(0)               # 填充固定值
df.fillna(df.mean())       # 填充均值
df.fillna(method='ffill')  # 前向填充
df.fillna(method='bfill')  # 后向填充
df['成绩'].fillna(df['成绩'].median(), inplace=True)
```

---

## 七、排序

```python
df.sort_values('成绩')                    # 按列排序
df.sort_values('成绩', ascending=False)   # 降序
df.sort_values(['班级','成绩'], ascending=[True, False])  # 多列排序
df.sort_index()                           # 按索引排序
```

---

## 八、分组聚合

```python
# 基础分组
df.groupby('班级')['成绩'].mean()
df.groupby('班级').agg({'成绩': 'mean', '姓名': 'count'})

# 多函数聚合
df.groupby('班级').agg(['mean', 'max', 'min', 'std', 'count'])

# 自定义聚合
df.groupby('班级').agg(
    平均分=('成绩', 'mean'),
    最高分=('成绩', 'max'),
    人数=('姓名', 'count')
).reset_index()

# transform：保持原形状，每组广播
df['班级均分'] = df.groupby('班级')['成绩'].transform('mean')
df['差值'] = df['成绩'] - df['班级均分']

# filter：按组过滤
df.groupby('班级').filter(lambda g: g['成绩'].mean() > 80)

# 遍历分组
for name, group in df.groupby('班级'):
    print(name, group.shape)
```

---

## 九、合并

```python
# concat：纵向/横向拼接
pd.concat([df1, df2])                    # 纵向（默认）
pd.concat([df1, df2], ignore_index=True) # 重置索引
pd.concat([df1, df2], axis=1)            # 横向

# merge：类似 SQL JOIN
pd.merge(df1, df2, on='id')                       # INNER JOIN
pd.merge(df1, df2, on='id', how='left')           # LEFT JOIN
pd.merge(df1, df2, on='id', how='right')          # RIGHT JOIN
pd.merge(df1, df2, on='id', how='outer')          # FULL JOIN
pd.merge(df1, df2, left_on='user_id', right_on='id')  # 不同列名

# join：按索引合并
df1.join(df2, on='key', how='left')
```

---

## 十、数据透视

```python
# pivot_table
pd.pivot_table(df, values='成绩', index='班级', columns='性别',
               aggfunc='mean', margins=True, fill_value=0)

# crosstab：交叉表（频率统计）
pd.crosstab(df['班级'], df['等级'], margins=True)

# melt：宽表 → 长表
pd.melt(df, id_vars=['姓名'], value_vars=['语文','数学','英语'],
        var_name='科目', value_name='分数')
```

---

## 十一、窗口函数（Pandas 版）

```python
# 排名
df['row_number'] = df['成绩'].rank(method='first')      # 连续排名
df['rank'] = df['成绩'].rank(method='min')              # 跳跃排名
df['dense_rank'] = df['成绩'].rank(method='dense')      # 连续排名
df['pct_rank'] = df['成绩'].rank(pct=True)              # 百分位排名

# 分组排名
df['class_rank'] = df.groupby('班级')['成绩'].rank(method='dense', ascending=False)

# 滚动窗口
df['rolling_avg_3'] = df['成绩'].rolling(window=3).mean()
df['rolling_sum'] = df['成绩'].rolling(3, min_periods=1).sum()

# 累计
df['cumsum'] = df['成绩'].cumsum()
df['cummax'] = df['成绩'].cummax()

# 偏移
df['prev'] = df['成绩'].shift(1)
df['next'] = df['成绩'].shift(-1)
df['diff'] = df['成绩'].diff()           # 与前一项的差

# 分组偏移
df['prev_in_class'] = df.groupby('班级')['成绩'].shift(1)

# expanding：扩展窗口
df['expanding_avg'] = df['成绩'].expanding().mean()
```

---

## 十二、字符串操作

```python
df['姓名'].str.upper()
df['姓名'].str.strip()
df['姓名'].str.replace('张', '章')
df['姓名'].str.contains('张')
df['邮箱'].str.split('@').str[1]    # 提取域名
df['姓名'].str.cat(sep=',')          # 拼接
df['电话'].str.extract(r'(\d{11})') # 正则提取
```

---

## 十三、日期时间

```python
df['日期'] = pd.to_datetime(df['日期'])
df['年'] = df['日期'].dt.year
df['月'] = df['日期'].dt.month
df['星期'] = df['日期'].dt.dayofweek
df['季度'] = df['日期'].dt.quarter
df.set_index('日期', inplace=True)           # 设为索引
df.resample('M')['销量'].sum()              # 按月重采样
```

---

## 十四、去重与唯一值

```python
df.drop_duplicates()                        # 完全重复行
df.drop_duplicates(subset=['姓名'])         # 指定列去重
df.drop_duplicates(subset=['姓名'], keep='last')  # 保留最后一条
df['姓名'].unique()                         # 唯一值
df['姓名'].nunique()                        # 唯一值个数
df['姓名'].value_counts()                   # 值频率统计
```

---

## 十五、性能优化

```python
# 分块读取大文件
for chunk in pd.read_csv('big.csv', chunksize=100000):
    process(chunk)

# 类型优化减少内存
df['id'] = df['id'].astype('int32')
df['类别'] = df['类别'].astype('category')

# apply 替代循环
df['新列'] = df.apply(lambda row: row['A'] + row['B'], axis=1)

# 向量化操作（比 apply 更快）
df['新列'] = df['A'] + df['B']
```

---
*最后更新: 2025-06-23*
