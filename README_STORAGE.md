# 数据存储配置说明

本项目使用 Cloudflare D1 数据库存储提交成功的钱包地址。

## 方案一：使用 Cloudflare D1（推荐）

### 1. 创建 D1 数据库

在 Cloudflare Dashboard 中：
1. 进入 Workers & Pages > D1
2. 点击 "Create database"
3. 输入数据库名称：`alpha-submissions`
4. 选择区域（建议选择离用户最近的区域）
5. 创建后，复制 `database_id`

### 2. 配置 wrangler.toml

编辑 `wrangler.toml` 文件，将 `YOUR_DATABASE_ID_HERE` 替换为实际的数据库 ID。

### 3. 初始化数据库表

在项目根目录运行：

```bash
# 安装 wrangler（如果还没有）
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 执行 SQL 创建表
wrangler d1 execute alpha-submissions --file=./database/schema.sql
```

### 4. 在 Cloudflare Pages 中绑定 D1

1. 进入 Cloudflare Dashboard > Pages > 你的项目
2. 进入 Settings > Functions
3. 在 "D1 database bindings" 中添加：
   - Variable name: `DB`
   - D1 database: `alpha-submissions`

### 5. 验证

提交表单后，可以在 Cloudflare Dashboard 的 D1 数据库中查看存储的数据。

---

## 方案二：使用 Cloudflare KV（备选）

如果不想使用 D1，可以使用 KV 存储：

### 1. 创建 KV 命名空间

在 Cloudflare Dashboard 中：
1. 进入 Workers & Pages > KV
2. 点击 "Create a namespace"
3. 输入名称：`submissions`
4. 创建后，复制命名空间 ID

### 2. 配置 wrangler.toml

取消注释 KV 配置部分，并填入实际的命名空间 ID。

### 3. 在 Cloudflare Pages 中绑定 KV

1. 进入 Cloudflare Dashboard > Pages > 你的项目
2. 进入 Settings > Functions
3. 在 "KV namespace bindings" 中添加：
   - Variable name: `SUBMISSIONS_KV`
   - KV namespace: `submissions`

---

## 本地开发

使用 Wrangler 进行本地开发：

```bash
# 启动本地开发服务器（支持 D1）
wrangler pages dev .next

# 或者使用 Next.js 开发服务器（需要配置环境变量）
npm run dev
```

---

## 注意事项

1. **D1 数据库限制**：
   - 免费版：100,000 次读取/天，1,000 次写入/天
   - 付费版有更高的限制

2. **KV 存储限制**：
   - 免费版：100,000 次读取/天，1,000 次写入/天
   - 每个 key 最大 25MB

3. **数据持久化**：
   - D1 数据持久化存储
   - KV 数据持久化存储
   - 两者都支持全球分布

4. **安全性**：
   - 确保 `TOKEN_SECRET` 环境变量在生产环境中使用强密钥
   - 数据库绑定只在服务器端可用，客户端无法直接访问

