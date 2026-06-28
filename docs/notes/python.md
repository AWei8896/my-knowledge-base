# Python 笔记

## 一、基础数据类型

```python
# 数字
a = 10          # int（整数，无大小限制）
b = 3.14        # float（浮点数）
c = 1 + 2j      # complex（复数）
d = True        # bool（int 的子类，True=1, False=0）

type(a)              # <class 'int'>
isinstance(a, int)   # True

# 字符串
s = "hello"
s = 'hello'
s = """多行字符串"""
s = f"name: {name}, age: {age}"        # f-string（推荐）
s = "name: {}, age: {}".format(name, age)

# 字符串不可变，所有操作都返回新字符串
s.upper()       # 全大写
s.lower()       # 全小写
s.strip()       # 去首尾空格
s.replace(old, new)
s.split(",")        # ["a", "b", "c"]
s.startswith("a")   # 判断开头

# 切片
s[0]     # 第一个字符
s[1:5]   # 索引1到4
s[::-1]  # 反转
```

---

## 二、控制流

### if-elif-else

```python
if score >= 90:
    grade = "A"
elif score >= 60:
    grade = "B"
else:
    grade = "C"

# 三元表达式
x = a if a > b else b
```

### 循环

```python
# for：遍历可迭代对象
for i in range(5):              # 0 1 2 3 4
for i in range(2, 10, 2):       # 2 4 6 8（步长）
for idx, val in enumerate(lst): # 同时拿索引和值

# while
while n > 0:
    n -= 1

# break（跳出循环）/ continue（跳过本次）
# for-else / while-else：循环正常结束（没被 break）时执行 else
for x in lst:
    if x == target:
        break
else:
    print("没找到")
```

### 推导式

```python
# 列表推导式
squares = [x**2 for x in range(10)]
evens = [x for x in range(20) if x % 2 == 0]

# 字典推导式
d = {x: x**2 for x in range(5)}

# 集合推导式
s = {x for x in "hello world" if x != " "}

# 生成器表达式（惰性，省内存）
gen = (x**2 for x in range(1000000))
```

---

## 三、数据容器

### 3.1 列表（List）

有序、可变、可重复。**支持增删改查**。

```python
lst = [1, 2, 3]
lst = list(range(5))
```

**增（添加元素）**

```python
lst.append(4)              # 末尾追加 → [1, 2, 3, 4]
lst.insert(1, 99)          # 索引1处插入 → [1, 99, 2, 3]
lst.extend([5, 6])         # 批量追加 → [1, 2, 3, 5, 6]
lst + [5, 6]               # 拼接返回新列表，原列表不变
lst * 2                    # 重复，[1, 2, 3, 1, 2, 3]
```

**删（删除元素）**

```python
del lst[1]                 # 按索引删，支持切片 del lst[1:3]
lst.pop()                  # 默认删末尾，返回被删值
lst.pop(2)                 # 删索引2，返回被删值
lst.remove(3)              # 按值删第一个匹配项，无返回值
lst.clear()                # 清空所有元素
```

**改（修改元素）**

```python
lst[0] = 100               # 按索引直接赋值
lst[1:3] = [7, 8, 9]      # 切片替换（可改变长度）
lst.sort()                 # 排序
lst.reverse()              # 反转
```

**查（查找元素）**

```python
lst[0]                     # 按索引取
lst[-1]                    # 最后一个
lst[1:4]                   # 切片，含左不含右
lst[::-1]                  # 反转
3 in lst                   # 判断是否存在
lst.index(3)               # 查找位置（不存在报错）
lst.count(3)               # 计数
len(lst)                   # 长度
```

### 3.2 元组（Tuple）

有序、**不可变**（无法增删改）、可重复。

```python
t = (1, 2, 3)
t = (1,)                  # 单元素元组必须加逗号
t = 1, 2, 3               # 可省略括号

# 查（只读，不支持增删改）
t[0]                       # 按索引取
t[1:3]                     # 切片
3 in t                     # 判断是否存在
t.index(3)                 # 查找位置
t.count(1)                 # 计数
len(t)                     # 长度

# 解包
a, b, c = t
a, *rest = (1, 2, 3, 4)    # rest = [2, 3, 4]
```

> 元组不可变意味着创建后不能修改元素。适合作为字典的键、函数返回多个值等场景。

### 3.3 字典（Dict）

无序（3.7+ 有序）、可变、键唯一。格式：`{键: 值}`。键必须不可变（字符串、数字、元组），值可以是任意类型。**支持增删改查**。

```python
d = {"name": "张三", "age": 20}
d = dict(name="张三", age=20)
```

**增（添加键值对）**

```python
d["gender"] = "男"              # 直接赋值，键不存在则新建
d.setdefault("score", 100)     # 安全添加：键存在不修改，不存在才添加
d.update({"city":"北京", "age":21})  # 批量添加/更新，已有键会覆盖
```

**删（删除键值对）**

```python
del d["age"]                    # 删除指定键，键不存在报 KeyError
d.pop("age")                    # 删除并返回被删值，键不存在报错
d.pop("age", 0)                 # 删除，键不存在返回默认值
d.popitem()                     # 删除并返回最后插入的键值对（3.7+）
d.clear()                       # 清空字典
```

**改（修改值）**

```python
d["age"] = 30                   # 直接赋值覆盖
d.update({"age": 30, "name": "李四"})  # 批量修改
d.setdefault("age", 18)         # 键已存在，不做任何修改
```

**查（查找键值）**

```python
d["name"]                       # 按键取值，键不存在报 KeyError
d.get("name", "未知")           # 安全取值，键不存在返回默认值
"name" in d                     # 判断键是否存在
d.keys()                        # 所有键
d.values()                      # 所有值
d.items()                       # 所有键值对
len(d)                          # 键值对数量
```

**字典遍历**

```python
for k in d:                 # 遍历键
for v in d.values():        # 遍历值
for k, v in d.items():      # 遍历键值对（推荐）
```

**字典实战 — 字符频率统计**

```python
s = input()
d = {}
for char in s:
    d[char] = d.get(char, 0) + 1
print(d)
```

> ⚠ 直接用 `d[char] += 1` 会报 `KeyError`，需先判断或用 `get()`。

**zip 函数**

```python
keys = ["name", "age"]
vals = ["张三", 25]
d = dict(zip(keys, vals))   # {"name": "张三", "age": 25}
```

### 3.4 集合（Set）

无序、不重复、可变。**支持增删查，不支持改**（无法修改单个元素的值）。

```python
s = {1, 2, 3}
s = set([1, 2, 3])
s = set()                # 空集合（不能用 {}，那是空字典）
```

**增（添加元素）**

```python
s.add(4)                 # 添加单个元素
s.add(1)                 # 元素已存在，无效果（自动去重）
s.update([5, 6, 7])      # 批量添加
```

**删（删除元素）**

```python
s.discard(3)             # 安全删除，元素不存在不报错
s.remove(3)              # 删除，元素不存在报 KeyError
s.pop()                  # 随机删除一个元素并返回（无序，慎用）
s.clear()                # 清空集合
```

**查（查找元素）**

```python
3 in s                   # 判断是否存在（O(1)，比列表的 O(n) 快）
len(s)                   # 元素个数
for x in s:              # 遍历

# 集合运算
a & b                    # 交集
a | b                    # 并集
a - b                    # 差集（a 有 b 没有）
a ^ b                    # 对称差集（只在其中一个集合中）
a <= b                   # 子集判断
```

> 集合特点：去重（自动去除重复值）、O(1) 成员判断、支持数学集合运算。

---

## 四、字符串处理

```python
# input() — 读取用户输入，返回值始终是字符串
s = input()

# str.split() — 切割字符串
lst = input().split()   # "a b c" → ["a", "b", "c"]

# 常用方法
s.strip()               # 去首尾空格
s.upper() / s.lower()   # 大小写
s.replace(old, new)     # 替换
s.find("x")             # 查找，找不到返回 -1
"x" in s                # 判断是否包含
s.startswith("a")       # 前缀判断
len(s)                  # 字符串长度
```

> ⚠ `input()` 返回值永远是字符串，做数学运算前必须 `int()` / `float()` 转换。

---

## 五、列表常用方法

以下方法直接修改原列表，大部分返回 `None`（不可用变量接收）。

| 方法 | 作用 | 返回值 |
|------|------|--------|
| `lst.append(x)` | 末尾追加 | `None` |
| `lst.insert(i, x)` | 指定位置插入 | `None` |
| `del lst[i]` | 按索引删除 | 无 |
| `lst.remove(x)` | 按值删除第一个匹配项 | `None` |
| `lst.pop(i)` | 按索引删除，返回被删值 | 被删元素 |
| `lst.sort(reverse=False)` | 排序 | `None` |
| `lst.reverse()` | 反转 | `None` |
| `lst.copy()` | 浅拷贝 | 新列表 |

> ⚠ 链式调用陷阱：`lst.sort().reverse()` 会报错，因为 `sort()` 返回 `None`。

---

## 六、del / remove / pop 区别

| 方法 | 删除依据 | 批量删除 | 有返回值 | 元素不存在时 |
|------|----------|----------|----------|-------------|
| `del lst[索引]` | 索引位置 | 支持切片 | 无 | `IndexError` |
| `lst.remove(值)` | 元素值（首个匹配） | 否 | `None` | `ValueError` |
| `lst.pop(索引)` | 索引位置 | 否 | 被删元素 | `IndexError` |

```python
del lst[0]          # 按位置删
del lst[1:3]        # 批量切片删
lst.remove("a")     # 按值删（不知道位置时用）
x = lst.pop()       # 默认删末尾，返回被删值
x = lst.pop(2)      # 删索引2，返回被删值
```

---

## 七、排序与反转

| 方法 | 原地修改 | 是否排序 | 返回值 | 适用类型 |
|------|----------|----------|--------|----------|
| `sort()` | 是 | 是 | `None` | 仅列表 |
| `sorted()` | 否 | 是 | 新列表 | 所有可迭代对象 |
| `reverse()` | 是 | 否 | `None` | 仅列表 |
| `lst[::-1]` | 否 | 否 | 新列表 | 列表/字符串/元组 |
| `reversed()` | 否 | 否 | 迭代器 | 所有可迭代对象 |

```python
new_lst = sorted(lst, reverse=True)       # 降序
new_lst = list(reversed(lst))             # 反转
lst.sort(reverse=True)                    # 原地降序
```

---

## 八、类型转换

需求：将 `input().split()` 的字符串列表转为数字列表

```python
# 写法一：for + append
nums = []
for x in input().split():
    nums.append(float(x))

# 写法二：列表推导式（最 Pythonic）
nums = [float(x) for x in input().split()]

# 写法三：map + list（最简洁）
nums = list(map(float, input().split()))
```

> ⚠ map 对象只能使用一次，用完变为空，需要时先 `list()` 存起来。

---

## 九、常用内置函数

| 函数 | 作用 | 注意 |
|------|------|------|
| `abs(x)` | 取绝对值 | 只能传单个数字，不能传列表 |
| `max(x)` | 取最大值 | 可传多个值或可迭代对象 |
| `min(x)` | 取最小值 | 同上 |
| `bin(x)` | 十进制 → 二进制 | 返回带 `0b` 前缀的字符串 |
| `oct(x)` | 十进制 → 八进制 | 返回带 `0o` 前缀的字符串 |
| `hex(x)` | 十进制 → 十六进制 | 返回带 `0x` 前缀的字符串 |
| `int(x)` | 字符串 → 整数 | `int("123")` |
| `float(x)` | 字符串 → 浮点数 | `float("3.14")` |
| `list(x)` | 可迭代对象 → 列表 | `list(map(int, s))` |

---

## 十、进制转换（手动实现）

```python
def to_base(n, base):
    digits = "0123456789abcdef"
    if n == 0:
        return "0"
    result = ""
    while n > 0:
        result = digits[n % base] + result
        n //= base
    return result
```

---

## 十一、逻辑运算

| 运算符 | 规则 | 说明 |
|--------|------|------|
| `x and y` | 全真才为真 | 若 x 为假，直接返回 x（短路） |
| `x or y` | 一真即为真 | 若 x 为真，直接返回 x（短路） |
| `not x` | 取反 | 只返回 True 或 False |

**视为 `False`**：`0`、`0.0`、`""`、`[]`、`()`、`{}`、`None`
**视为 `True`**：非 0 数字、非空字符串、非空列表等

---

## 十二、核心规则：原地操作 vs 返回新值

| 分类 | 方法 | 是否修改原数据 | 返回值 |
|------|------|:---:|:---:|
| 原地修改 | `append` / `insert` / `remove` / `sort` / `reverse` | 是 | `None` |
| 有返回值 | `pop()` | 是 | 被删元素 |
| 有返回值 | `sorted()` / `reversed()` / `copy()` / `切片` / `map()` | 否 | 新对象 |

```python
# ❌ 错误：sort() 返回 None
res = lst.sort()

# ✅ 正确
lst.sort()                # 原地排序
res = sorted(lst)         # 返回新列表
```

---

## 十三、函数

**定义**：函数是用 `def` 关键字定义的一段**可重复使用的代码块**，接收输入（参数），执行特定逻辑，返回输出（返回值）。核心目的：**封装重复逻辑、提高代码复用性、降低维护成本**。

```python
def 函数名(参数列表):
    """文档字符串（可选）：描述函数功能"""
    函数体
    return 返回值    # 可省略，默认返回 None
```

**关键概念**：

| 概念 | 说明 | 示例 |
|------|------|------|
| **形参** (Parameter) | 函数定义时的变量名 | `def add(a, b):` 中的 `a`、`b` |
| **实参** (Argument) | 调用时传入的实际值 | `add(3, 5)` 中的 `3`、`5` |
| **返回值** (Return) | 函数执行后返回的结果 | `return a + b` |
| **作用域** (Scope) | 函数内变量为局部变量，外部不可访问 | — |
| **文档字符串** (Docstring) | `"""..."""` 描述函数功能 | `help(函数名)` 可查看 |

### 定义与调用

```python
def add(a, b):
    """返回两个数的和"""
    return a + b

result = add(3, 5)     # 调用函数，result = 8

# 默认参数（默认值只计算一次，不要用可变对象当默认值）
def greet(name, greeting="你好"):
    return f"{greeting}, {name}"

greet("张三")           # "你好, 张三"（使用默认值）
greet("李四", "早上好") # "早上好, 李四"（覆盖默认值）

# 关键字参数（可以不按顺序传参）
greet(name="张三", greeting="早上好")

# 可变参数
def func(*args):           # *args — 位置参数打包为元组
def func(**kwargs):        # **kwargs — 关键字参数打包为字典
def func(*args, **kwargs): # 通用形式（接收任意参数）

# 多返回值（本质是返回元组）
def min_max(lst):
    return min(lst), max(lst)
a, b = min_max([1, 5, 3])   # 解包：a=1, b=5
```

### lambda 匿名函数

**定义**：`lambda` 是一种**无需命名**的简洁函数写法，只能包含**单个表达式**，自动返回表达式的结果。语法：`lambda 参数: 表达式`。

**适用场景**：需要一个简单函数作为参数传给 `map()`、`filter()`、`sorted()` 等，但不想单独用 `def` 定义。

```python
# def 写法
def add(a, b):
    return a + b

# lambda 等价写法
add = lambda a, b: a + b

# 常见用法：作为高阶函数的参数
sorted(lst, key=lambda x: x[1])       # 按第二个元素排序
list(map(lambda x: x**2, lst))        # 每个元素平方
list(filter(lambda x: x > 0, lst))    # 筛选大于0的元素
```

> ⚠ lambda 只能写**一个表达式**，不能包含语句（如 `if`、`for`、`print`）、不能多行。复杂逻辑用 `def`。

### 闭包

**定义**：闭包（Closure）是指**一个内部函数记住了它外层作用域的变量**，即使外层函数已经执行完毕。三个条件：① 嵌套函数（函数内定义函数）② 内部函数引用了外部函数的变量 ③ 外部函数返回内部函数。

**本质**：`inner` 函数"携带"了 `outer` 的环境变量，像一个自带状态的函数。

```python
def outer(x):                 # 外层函数
    def inner(y):             # 内层函数
        return x + y          # inner 引用了 outer 的变量 x
    return inner              # 返回 inner 函数（携带了 x 的值）

add5 = outer(5)               # add5 就是一个"记住了 x=5"的 inner
add5(3)                       # 8（5 + 3）

add10 = outer(10)             # add10 记住了 x=10
add10(3)                      # 13（10 + 3）
```

**闭包 vs 普通函数**：

| 对比 | 普通函数 | 闭包 |
|------|----------|------|
| 数据来源 | 只依赖传入的参数 | 参数 + 外层"记住"的变量 |
| 状态保持 | 每次调用独立，不保留状态 | 内层函数保持外层的变量引用 |
| 典型用途 | 通用计算 | 创建"配置好"的专用函数 |

```python
# 实用例子：创建不同税率的计算器
def make_tax_calc(rate):
    def calc(price):
        return price * (1 + rate)
    return calc

vat_calc = make_tax_calc(0.13)  # 13% 增值税计算器
lux_calc = make_tax_calc(0.20)  # 20% 奢侈品税计算器

vat_calc(100)   # 113.0
lux_calc(100)   # 120.0
```

> 💡 闭包是实现装饰器的基础——装饰器的 `wrapper` 函数就是一个闭包，它"记住"了被装饰的原始函数。

### 装饰器

**定义**：装饰器是一个函数，接收一个函数作为参数，返回一个新函数（在原函数的基础上添加额外功能）。遵循**开闭原则**——对扩展开放，对修改封闭。`@decorator` 等价于 `func = decorator(func)`。

```python
# 基础用法：测量执行时间
def timer(func):
    import time
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} 耗时: {time.time()-start:.4f}s")
        return result
    return wrapper

@timer
def slow_func():
    time.sleep(1)
```

**带参数的装饰器**：

```python
def retry(max_attempts=3, delay=1):
    """失败自动重试的装饰器"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(max_attempts=3, delay=2)  # 失败后重试最多3次，间隔2秒
def call_api(url):
    ...
```

**保留原函数元信息**：

```python
from functools import wraps

def log(func):
    @wraps(func)            # 保留原函数的 __name__ 和 __doc__
    def wrapper(*args, **kwargs):
        print(f"调用 {func.__name__}")
        return func(*args, **kwargs)
    return wrapper
```

**常见应用场景**：

| 场景 | 说明 |
|------|------|
| 日志记录 | 自动打印函数调用信息 |
| 性能计时 | 测量函数执行时间 |
| 权限校验 | 检查用户是否有权限执行 |
| 缓存/记忆化 | `@lru_cache` 缓存函数返回值 |
| 重试机制 | 失败后自动重试 |
| 参数校验 | 自动检查参数合法性 |

```python
from functools import lru_cache

@lru_cache(maxsize=128)       # 最近128次调用的结果缓存
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

fib(100)  # 不加缓存会卡死，加了瞬间出结果
```

> 💡 **装饰器执行时机**：装饰器在**函数定义时**就执行（不是调用时）。`@timer` 在 `def slow_func()` 完成时立即执行，原函数被替换为 `wrapper`。

### 常用高阶函数

```python
from functools import reduce

map(func, iterable)              # 每个元素应用函数
filter(func, iterable)           # 筛选
reduce(lambda a, b: a + b, lst)  # 累积计算
```

---

## 十四、异常处理

```python
try:
    result = 10 / num
except ZeroDivisionError:
    print("不能除以0")
except (TypeError, ValueError) as e:
    print(f"类型错误: {e}")
except Exception as e:
    print(f"未知错误: {e}")
else:
    print(f"成功，结果: {result}")
finally:
    print("无论是否异常都执行")

# 自定义异常
class MyError(Exception):
    def __init__(self, msg):
        self.msg = msg

raise MyError("自定义错误")
```

---

## 十五、文件操作

```python
# 读取
with open("file.txt", "r", encoding="utf-8") as f:
    content = f.read()         # 全读
    lines = f.readlines()      # 按行读取为列表

with open("file.txt", "r") as f:
    for line in f:             # 逐行读（推荐，省内存）

# 写入
with open("out.txt", "w", encoding="utf-8") as f:
    f.write("hello\n")
    f.writelines(lines)

# 模式: r=读 w=写(覆盖) a=追加 x=新建 r+=读写 b=二进制
```

---

## 十六、迭代器与生成器

### 迭代器（Iterator）

**定义**：实现了 `__iter__()` 和 `__next__()` 方法的对象。`__iter__()` 返回迭代器自身，`__next__()` 返回下一个元素，没有元素时抛出 `StopIteration`。

```python
# 手动创建一个迭代器
class Counter:
    def __init__(self, start, end):
        self.current = start
        self.end = end

    def __iter__(self):
        return self   # 迭代器返回自身

    def __next__(self):
        if self.current >= self.end:
            raise StopIteration
        self.current += 1
        return self.current - 1

for num in Counter(1, 4):
    print(num)         # 1  2  3
```

**可迭代对象 vs 迭代器**：

| 概念 | 说明 | 例子 |
|------|------|------|
| 可迭代对象 (Iterable) | 实现 `__iter__()`，返回一个迭代器 | `list`、`tuple`、`dict`、`set`、`str` |
| 迭代器 (Iterator) | 实现 `__iter__()` + `__next__()` | `map()`、`filter()`、生成器对象 |

```python
lst = [1, 2, 3]          # 可迭代对象，但不是迭代器
it = iter(lst)            # 通过 iter() 获取迭代器
next(it)                  # 1
next(it)                  # 2
```

> ⚠ 迭代器**一次性消耗**，遍历完就空了：`list(it)` 只能调一次，第二次返回 `[]`。

### 生成器（Generator）

**定义**：用 `yield` 关键字代替 `return` 的函数。调用生成器函数不执行函数体，而是返回一个生成器对象（也是迭代器）。每次 `next()` 执行到 `yield` 处暂停并返回值，下次从暂停处继续。

```python
# 生成器函数（最简洁的创建方式）
def counter(start, end):
    while start < end:
        yield start      # 暂停并返回值，下次从这里继续
        start += 1

# 使用（和迭代器完全一样）
for num in counter(1, 4):
    print(num)           # 1  2  3
```

**生成器表达式**（更简洁）：

```python
# 列表推导式 → 一次性生成全部（占内存）
squares_list = [x**2 for x in range(1000000)]

# 生成器表达式 → 惰性计算（省内存）
squares_gen = (x**2 for x in range(1000000))
next(squares_gen)      # 0
next(squares_gen)      # 1
```

**`yield from` — 委托子生成器**：

```python
def chain(*iterables):
    for it in iterables:
        yield from it   # 逐个产出子迭代器的值

list(chain([1, 2], [3, 4]))  # [1, 2, 3, 4]
```

### 迭代器 vs 生成器 — 核心区别

| 维度 | 迭代器 | 生成器 |
|------|--------|--------|
| 创建方式 | 实现 `__iter__` + `__next__` 的类 | 带 `yield` 的函数 / 生成器表达式 |
| 代码量 | 多，需要写完整的类 | 少，一个函数就搞定 |
| 状态管理 | 手动维护 `self.current` 等变量 | Python 自动保存执行状态 |
| 本质关系 | 是一种协议（Protocol） | 是迭代器的一种实现方式 |
| 内存占用 | 取决于实现 | 惰性计算，省内存 |
| 可重用性 | 需要重新创建对象 | 用完即弃，需重新调用函数 |

```python
# 同一个功能 — 斐波那契数列前 n 项

# 迭代器写法
class FibIterator:
    def __init__(self, n):
        self.n = n; self.i = 0; self.a, self.b = 0, 1
    def __iter__(self): return self
    def __next__(self):
        if self.i >= self.n: raise StopIteration
        self.i += 1; val = self.a
        self.a, self.b = self.b, self.a + self.b
        return val

# 生成器写法
def fib_generator(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
```

> 💡 处理大型数据流（日志、数据库批量读取、无限序列）时，用生成器避免一次性加载全部数据到内存。

---

## 十七、面向对象编程

```python
class Person:
    # 类属性（所有实例共享）
    species = "人类"

    # 构造方法
    def __init__(self, name, age):
        self.name = name            # 实例属性
        self.__age = age            # 私有属性（双下划线）

    # 实例方法
    def say_hello(self):
        return f"我是{self.name}"

    # 属性访问器
    @property
    def age(self):
        return self.__age

    @age.setter
    def age(self, value):
        if value < 0:
            raise ValueError("年龄不能为负")
        self.__age = value

    # 类方法（第一个参数是类本身）
    @classmethod
    def from_birth_year(cls, name, year):
        return cls(name, 2025 - year)

    # 静态方法（不需要 self 或 cls）
    @staticmethod
    def is_adult(age):
        return age >= 18

    # 魔术方法
    def __str__(self):
        return f"Person(name={self.name}, age={self.__age})"

    def __repr__(self):
        return f"Person('{self.name}', {self.__age})"

    def __eq__(self, other):
        return self.name == other.name and self.age == other.age

# 使用
p = Person("张三", 20)
p2 = Person.from_birth_year("李四", 2000)
print(p.age)           # 通过 property 访问
print(p2)              # 自动调用 __str__
```

---

## 十八、面向对象三大特性

### 1. 封装（Encapsulation）

将数据和操作封装在类内部，隐藏实现细节，只暴露必要的接口。

```python
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.__balance = balance      # 私有，外部不可直接访问

    def deposit(self, amount):        # 公有接口
        if amount > 0:
            self.__balance += amount
        else:
            raise ValueError("金额必须为正")

    def withdraw(self, amount):
        if 0 < amount <= self.__balance:
            self.__balance -= amount
        else:
            raise ValueError("余额不足")

    @property
    def balance(self):                # 只读属性
        return self.__balance
```

> Python 通过命名约定 `_protected`、`__private` 实现封装。`__private` 会被改写为 `_ClassName__private`，可绕过但不推荐。

### 2. 继承（Inheritance）

子类复用父类的属性和方法，并可扩展或重写。

```python
class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        return "..."

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)     # 调用父类构造
        self.breed = breed
    def speak(self):               # 重写父类方法
        return "汪汪"

class Cat(Animal):
    def speak(self):
        return "喵喵"
```

| 继承类型 | 示例 | 说明 |
|----------|------|------|
| 单继承 | `class Dog(Animal)` | 一个父类 |
| 多层继承 | `class Puppy(Dog)` | 父类也有父类 |
| 多重继承 | `class Pet(Dog, Cat)` | 多个父类，MRO 决定调用顺序 |

> `super()` 按 MRO 顺序查找，不是简单地调父类。钻石继承时 MRO 保证每个类只调用一次。

### 3. 多态（Polymorphism）

同一操作作用于不同对象，表现出不同行为。Python 是鸭子类型——只要对象有对应方法就能调用。

```python
# 不同类有同名方法，统一调用
class Dog:
    def speak(self):
        return "汪汪"

class Cat:
    def speak(self):
        return "喵喵"

def animal_sound(animal):
    return animal.speak()          # 不检查类型，有 speak() 就能调

print(animal_sound(Dog()))         # 汪汪
print(animal_sound(Cat()))         # 喵喵
```

| 形式 | 说明 |
|------|------|
| 鸭子类型 | 有方法就能调，不关心类型 |
| 继承多态 | 子类重写父类方法 |
| 函数重载 | `functools.singledispatch` 模拟 |

---

## 十九、模块与包

```python
# 导入
import math
from math import sqrt, pi
import numpy as np

# 相对导入（包内部）
from . import sibling
from .. import parent

# 脚本入口
if __name__ == "__main__":
    main()
```

包结构：

```
mypackage/
├── __init__.py
├── module_a.py
└── subpackage/
    ├── __init__.py
    └── module_c.py
```

---

## 代码模板速查

```python
# 一行读取整数列表
nums = list(map(int, input().split()))

# 字符频率统计
d = {}
for char in s:
    d[char] = d.get(char, 0) + 1

# 同时取最大最小值
print(max(lst))
print(min(lst))

# 三元表达式
x = a if a > b else b

# 文件安全读写
with open("file.txt", "r", encoding="utf-8") as f:
    for line in f:
        process(line)
```

---
*最后更新: 2025-06-23*
