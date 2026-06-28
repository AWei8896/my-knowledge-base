# Linux 常用命令

## 一、文件与目录

### 基础操作

```bash
# 目录跳转
cd /path/to/dir          # 进入目录
cd ..                    # 返回上级
cd ~                     # 回到家目录
cd -                     # 返回上次所在目录
pwd                      # 显示当前路径

# 查看目录
ls                       # 列出文件和目录
ls -l                    # 详细信息（权限、大小、时间）
ls -a                    # 显示隐藏文件
ls -lh                   # 人类可读的文件大小
ls -lt                   # 按修改时间排序
ls -ltr                  # 按修改时间倒序（最新的在最后）
ll                       # 通常 = ls -l 的别名

# 创建
mkdir dir_name           # 创建目录
mkdir -p a/b/c           # 递归创建多层目录
touch file.txt           # 创建空文件，或更新文件时间戳

# 复制
cp src dest              # 复制文件
cp -r src_dir dest_dir   # 递归复制目录
cp -p file1 file2        # 保留文件属性（权限、时间戳）

# 移动/重命名
mv old_name new_name     # 重命名
mv file /path/to/dir/    # 移动文件
mv -i file dest          # 覆盖前确认

# 删除
rm file.txt              # 删除文件
rm -r dir_name           # 递归删除目录
rm -rf dir_name          # 强制递归删除（慎用！）
rmdir dir_name           # 删除空目录

# 链接
ln -s /target/src link   # 创建软链接（快捷方式）
ln file hard_link        # 创建硬链接
```

### 文件查看

```bash
cat file.txt             # 全量输出
cat -n file.txt          # 带行号输出
tac file.txt             # 反向输出（倒序）

head -n 10 file.txt      # 前 10 行
head -n -5 file.txt      # 除了最后 5 行
tail -n 20 file.txt      # 最后 20 行
tail -f log.txt          # 实时追踪文件末尾（看日志）

more file.txt            # 分页查看（只能向下）
less file.txt            # 分页查看（可上下翻，推荐）
    # less 快捷键：空格翻页 / B 回翻 / q 退出 / /keyword 搜索 / n 下一个

nl file.txt              # 带行号输出
wc file.txt              # 统计行数、单词数、字节数
wc -l file.txt           # 只统计行数
```

---

## 二、用户与权限

### 用户管理

```bash
whoami                   # 当前用户
id                       # 用户 ID 和组信息
who                      # 当前登录的用户列表
w                        # 更详细的登录信息

# root 权限
sudo command             # 以 root 执行一条命令
sudo -i                  # 切换到 root 用户
su - username            # 切换到指定用户

# 用户操作（需 root）
useradd username         # 添加用户
passwd username          # 修改密码
userdel username         # 删除用户
usermod -aG group user   # 将用户添加到一个组
```

### 权限管理

```bash
# 权限格式：rwx(所有者)rwx(组)rwx(其他人)
# r=4  w=2  x=1
# 755 = rwxr-xr-x  644 = rw-r--r--

chmod 755 file.sh        # 数字方式设置权限
chmod +x script.sh       # 添加可执行权限
chmod u+x file           # 所有者加执行(u=user,g=group,o=other)
chmod -R 755 dir/        # 递归设置目录下所有文件

chown user:group file    # 修改文件所属用户和组
chown -R user:group dir/ # 递归修改
```

**权限含义：**

| 权限 | 文件 | 目录 |
|------|------|------|
| **r** (读) | 可读取文件内容 | 可列出目录内容 |
| **w** (写) | 可修改文件内容 | 可在目录中创建/删除文件 |
| **x** (执行) | 可作为程序执行 | 可进入该目录 |

---

## 三、进程管理

```bash
# 查看进程
ps aux                   # 所有用户的所有进程
ps -ef                   # 同上，Unix 风格
ps -ef | grep java       # 查找 java 相关进程

top                      # 实时进程监控（按 1 看每核 / 按 q 退出）
htop                     # top 增强版（需安装，彩色交互式）

# 查看端口
netstat -tunlp           # 查看所有监听端口
netstat -anp | grep 8080 # 查看 8080 端口被谁占用
ss -tunlp                # netstat 的现代替代
lsof -i :8080            # 查看 8080 端口被谁占用

# 结束进程
kill pid                 # 正常终止进程（SIGTERM）
kill -9 pid              # 强制杀死进程（SIGKILL，慎用）
killall java             # 按进程名杀死
pkill -f "python app.py" # 按匹配模式杀死

# 后台运行
command &                # 后台运行
nohup command &          # 后台运行，退出终端不中断
nohup command > log.txt 2>&1 &  # 后台运行 + 输出重定向
jobs                     # 查看后台任务
fg %1                    # 把 1 号后台任务切回前台
bg %1                    # 继续运行 1 号后台任务

# 信号
Ctrl + C                 # 终止前台进程
Ctrl + Z                 # 暂停前台进程（回到后台暂停状态）
Ctrl + D                 # EOF（退出终端、退出 python 交互等）
```

---

## 四、磁盘与内存

```bash
# 磁盘空间
df -h                    # 查看各分区使用情况
df -h /data              # 查看指定目录所在分区
du -sh *                 # 当前目录下每个文件/目录的大小
du -sh dir_name          # 指定目录的大小
du -h --max-depth=1      # 一层深度的大小
du -sh * | sort -rh      # 按大小排序

# 内存
free -h                  # 查看内存使用情况
free -m                  # 以 MB 显示
cat /proc/meminfo        # 详细内存信息

# 系统信息
uname -a                 # 内核和系统信息
cat /etc/os-release      # 操作系统版本
hostname                 # 主机名
uptime                   # 系统运行时间 + 负载
lscpu                    # CPU 信息
```

---

## 五、文本处理三剑客

### grep — 文本搜索

```bash
grep "keyword" file.txt           # 搜索包含 keyword 的行
grep -i "keyword" file.txt        # 忽略大小写
grep -v "keyword" file.txt        # 排除 keyword，取不包含的
grep -n "keyword" file.txt        # 显示行号
grep -c "keyword" file.txt        # 统计匹配行数
grep -r "keyword" dir/            # 递归搜索目录
grep -E "pattern1|pattern2" file  # 正则匹配（-E 使用扩展正则）
grep -A 3 "keyword" file          # 显示匹配行 + 后 3 行
grep -B 2 "keyword" file          # 显示匹配行 + 前 2 行
grep -C 3 "keyword" file          # 显示匹配行 + 前后各 3 行

# 常用组合
ps -ef | grep java                # 查找 java 进程
cat error.log | grep -i error     # 搜索日志中的错误
history | grep git                # 搜索历史命令
```

### sed — 流编辑器

```bash
# 替换（最常用）
sed 's/old/new/' file             # 每行第一个 old → new
sed 's/old/new/g' file            # 每行所有 old → new（g=全局）
sed 's/old/new/2' file            # 每行第 2 个 old → new
sed -i 's/old/new/g' file         # 直接修改文件（-i=in-place）

# 删除
sed '3d' file                     # 删除第 3 行
sed '2,5d' file                   # 删除 2~5 行
sed '/keyword/d' file             # 删除匹配行

# 打印
sed -n '5p' file                  # 只打印第 5 行
sed -n '10,20p' file              # 打印 10~20 行
```

### awk — 文本分析

```bash
# 按列处理
awk '{print $1}' file             # 打印第 1 列
awk '{print $1, $3}' file         # 打印第 1、3 列
awk '{print $NF}' file            # 打印最后一列（NF=列数）
awk -F ',' '{print $2}' file      # 指定逗号为分隔符（默认空格）

# 条件过滤
awk '$3 > 80' file                # 第 3 列 > 80 的行
awk '$1 == "张三"' file           # 第 1 列等于 张三
awk '/keyword/ {print $1}' file   # 匹配行的第 1 列

# 统计
awk '{sum += $1} END {print sum}' file       # 第 1 列求和
awk '{sum += $1} END {print sum/NR}' file    # 第 1 列求平均值
awk '{print $1}' file | sort | uniq -c        # 第 1 列计数（组合）
```

---

## 六、管道与重定向

```bash
# 管道：前一个命令的输出 → 后一个命令的输入
ps -ef | grep java
cat file.txt | sort | uniq -c | sort -rn

# 输出重定向
command > file           # 覆盖写入文件
command >> file          # 追加写入文件
command 2>&1             # 错误输出合并到标准输出
command > file 2>&1      # 标准输出和错误都写入文件
command > /dev/null      # 丢弃输出（黑洞）

# 输入重定向
command < file           # 从文件读取输入

# 常用组合
nohup python app.py > log.txt 2>&1 &    # 后台运行 + 日志
ls | wc -l                              # 统计文件数
cat /dev/null > file.log                # 清空日志文件
```

---

## 七、压缩与解压

### 按格式速查

| 格式 | 压缩命令 | 解压命令 |
|------|----------|----------|
| `.tar` | `tar -cvf a.tar dir/` | `tar -xvf a.tar` |
| `.tar.gz` / `.tgz` | `tar -czvf a.tar.gz dir/` | `tar -xzvf a.tar.gz` |
| `.tar.bz2` / `.tbz` | `tar -cjvf a.tar.bz2 dir/` | `tar -xjvf a.tar.bz2` |
| `.tar.xz` | `tar -cJvf a.tar.xz dir/` | `tar -xJvf a.tar.xz` |
| `.gz` | `gzip file` | `gunzip file.gz` / `gzip -d file.gz` |
| `.bz2` | `bzip2 file` | `bunzip2 file.bz2` / `bzip2 -d file.bz2` |
| `.xz` | `xz file` | `unxz file.xz` / `xz -d file.xz` |
| `.zip` | `zip -r a.zip dir/` | `unzip a.zip` |
| `.rar` | `rar a a.rar dir/` | `unrar x a.rar` |
| `.7z` | `7z a a.7z dir/` | `7z x a.7z` |
| `.Z` | `compress file` | `uncompress file.Z` |

### tar 命令详解

```bash
# 打包/压缩（c=create 创建）
tar -cvf archive.tar dir/         # 仅打包，不压缩
tar -czvf archive.tar.gz dir/     # 打包 + gzip 压缩
tar -cjvf archive.tar.bz2 dir/    # 打包 + bzip2 压缩（更高压缩比）
tar -cJvf archive.tar.xz dir/     # 打包 + xz 压缩（压缩比最高，最慢）

# 解包/解压（x=eXtract 提取）
tar -xvf archive.tar              # 解包
tar -xzvf archive.tar.gz          # 解压 tar.gz
tar -xjvf archive.tar.bz2         # 解压 tar.bz2
tar -xJvf archive.tar.xz          # 解压 tar.xz

# 解压到指定目录
tar -xzvf archive.tar.gz -C /target/dir/

# 不解压，只看压缩包内容
tar -tzvf archive.tar.gz          # t=list 列出

# 只解压压缩包中的某个文件
tar -xzvf archive.tar.gz path/to/file.txt

# 排除某些文件再打包
tar -czvf archive.tar.gz dir/ --exclude='*.log' --exclude='node_modules/'

# 记忆技巧：c=create, x=eXtract, t=lisT, z=gZip, j=bZip2, J=xZ, v=Verbose, f=File
```

### gzip / bzip2 / xz 单文件压缩

```bash
# gzip（最常用）
gzip file.txt                     # 压缩为 file.txt.gz，原文件删除
gzip -k file.txt                  # 压缩但保留原文件
gzip -d file.txt.gz               # 解压 = gunzip
gunzip file.txt.gz                # 解压
gzip -9 file.txt                  # 最高压缩比（1-9，默认6）

# bzip2（压缩比更高，速度更慢）
bzip2 file.txt                    # 压缩为 file.txt.bz2
bzip2 -d file.txt.bz2             # 解压 = bunzip2
bunzip2 file.txt.bz2              # 解压

# xz（压缩比最高，速度最慢）
xz file.txt                       # 压缩为 file.txt.xz
xz -d file.txt.xz                 # 解压 = unxz
unxz file.txt.xz                  # 解压
```

### zip / unzip

```bash
# 压缩
zip archive.zip file1 file2       # 压缩多个文件
zip -r archive.zip dir/           # 递归压缩目录
zip -r -q archive.zip dir/        # 安静模式，不输出详情

# 解压
unzip archive.zip                 # 解压到当前目录
unzip archive.zip -d /target/     # 解压到指定目录
unzip -o archive.zip              # 覆盖已有文件不提示
unzip -n archive.zip              # 不覆盖已有文件
unzip -l archive.zip              # 只看内容不解压
unzip -v archive.zip              # 查看详细信息

# 密码
zip -P password archive.zip file  # 带密码压缩
unzip -P password archive.zip     # 带密码解压
```

### rar / 7z（需安装）

```bash
# rar（安装：apt install rar / yum install rar）
rar a archive.rar dir/            # a=添加 压缩
rar x archive.rar                 # x=完整路径解压
rar e archive.rar                 # e=所有文件解压到当前目录
rar l archive.rar                 # l=列出内容

# 7z（安装：apt install p7zip-full / yum install p7zip）
7z a archive.7z dir/              # a=添加 压缩
7z x archive.7z                   # x=完整路径解压
7z e archive.7z                   # e=所有文件解压到当前目录
7z l archive.7z                   # l=列出内容
```

### 分卷压缩与解压

```bash
# 分卷压缩（每个卷 100MB）
tar -czvf - dir/ | split -b 100M - archive.tar.gz.   # 生成 .aa .ab .ac ...
zip -s 100m -r archive.zip dir/                       # 生成 .z01 .z02 ... .zip

# 分卷解压
cat archive.tar.gz.* | tar -xzvf -                    # tar 分卷合并解压
zip -s 0 archive.zip --out merged.zip && unzip merged.zip  # zip 分卷合并解压
```

---

## 八、网络配置

```bash
# 查看网络
ip addr                         # 查看 IP 地址（现代方式）
ifconfig                        # 查看 IP 地址（传统方式，需装 net-tools）
hostname -I                     # 快速查看本机 IP

# 连通性
ping -c 4 hostname              # ping 4 次
ping -c 2 192.168.1.1           # ping 指定 IP

# DNS
nslookup example.com            # 查询 DNS
dig example.com                 # 详细 DNS 查询

# 下载
curl -O https://example.com/file.tar.gz    # 下载文件
curl -L https://example.com     # 跟随重定向
curl -I https://example.com     # 只看响应头
curl -X POST -d '{"key":"val"}' https://api.example.com  # POST 请求

wget https://example.com/file.tar.gz      # 下载文件
wget -c https://example.com/file.tar.gz   # 断点续传

# SSH
ssh user@host                   # 连接远程主机
ssh -p 2222 user@host           # 指定端口
ssh -i key.pem user@host        # 使用密钥文件
scp file.txt user@host:/path/   # 远程拷贝
scp -r dir/ user@host:/path/    # 递归拷贝目录
rsync -avz src/ user@host:dst/  # 增量同步（更高效）
```

---

## 九、查找与定位

```bash
# find — 文件查找
find dir -name "*.py"           # 按文件名查找
find dir -type f                # 只查文件（d=目录, l=链接）
find dir -mtime -7              # 最近 7 天修改的文件
find dir -size +100M            # 大于 100MB 的文件
find dir -name "*.log" -delete  # 找到并删除
find dir -name "*.py" | xargs grep "keyword"  # 找文件并搜索内容

# which / whereis — 命令定位
which python                    # 命令所在路径
whereis python                  # 命令 + 源码 + 手册位置

# locate — 快速查找（需 updatedb 更新数据库）
locate file.txt                 # 在数据库中搜索
```

---

## 十、软件安装

```bash
# yum（CentOS / RHEL）
yum install package             # 安装
yum remove package              # 卸载
yum update package              # 更新
yum search keyword              # 搜索
yum list installed              # 已安装列表

# apt（Ubuntu / Debian）
apt install package             # 安装
apt remove package              # 卸载
apt update                      # 更新源列表
apt upgrade                     # 升级所有包
apt search keyword              # 搜索

# pip（Python）
pip install package             # 安装
pip install package==1.0.0      # 安装指定版本
pip uninstall package           # 卸载
pip list                        # 已安装列表
pip freeze > requirements.txt   # 导出依赖
pip install -r requirements.txt # 批量安装
```

---

## 十一、Shell 常用技巧

```bash
# 别名
alias ll='ls -l'                # 创建别名
alias gs='git status'           # git 快捷别名
unalias ll                      # 删除别名

# 环境变量
export PATH=$PATH:/new/path     # 临时添加 PATH
export JAVA_HOME=/usr/java/jdk  # 设置环境变量
echo $PATH                      # 查看环境变量
printenv                        # 打印所有环境变量

# 历史
history                         # 查看历史命令
history 20                      # 最近 20 条
!123                            # 执行第 123 号历史命令
!!                              # 执行上一条
!$                              # 上一条命令的最后一个参数
Ctrl + R                        # 交互式搜索历史命令

# 快捷键
Ctrl + A                        # 光标移到行首
Ctrl + E                        # 光标移到行尾
Ctrl + U                        # 删除光标前的内容
Ctrl + K                        # 删除光标后的内容
Ctrl + L                        # 清屏（等于 clear）
Alt  + B                        # 光标回退一个单词
Alt  + F                        # 光标前进一个单词

# 组合命令
command1 && command2             # 前者成功才执行后者
command1 || command2             # 前者失败才执行后者
command1 ; command2              # 依次执行，不管结果
```

## 十二、常用快捷键速查

| 快捷键 | 作用 |
|--------|------|
| `Ctrl + C` | 终止当前进程 |
| `Ctrl + Z` | 暂停进程（丢到后台） |
| `Ctrl + D` | EOF（退出终端） |
| `Ctrl + L` | 清屏 |
| `Ctrl + R` | 搜索历史命令 |
| `Ctrl + A` | 光标移到行首 |
| `Ctrl + E` | 光标移到行尾 |
| `Ctrl + U` | 删除行首到光标处 |
| `Ctrl + K` | 删除光标到行尾处 |
| `Tab` | 自动补全 |

---
*最后更新: 2025-06-23*
