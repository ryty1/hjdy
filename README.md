# 【非原创】SerokVip 订阅汇聚，修改自[CM大佬](https://github.com/cmliu/CF-Workers-SUB)项目，自用！
# 感谢 `CM大佬` 提供优秀的作品。

一个基于 Cloudflare Workers 的订阅汇聚工具，支持多种节点格式的聚合与转换。

## ✨ 功能特点

- 🔗 **多格式支持**：自动解析 VLESS、VMess、Trojan、Shadowsocks、Hysteria2、TUIC 等节点
- 📦 **订阅聚合**：将多个订阅源和单独节点汇聚为一个订阅
- 🔄 **格式转换**：支持 Base64 和 Clash 两种输出格式
- 🔐 **访问控制**：独立的管理密码和访问令牌
- 🌐 **在线编辑**：通过 Web 界面管理订阅内容
- 👥 **访客模式**：可生成只读的访客订阅链接

---

## 🚀 部署教程

### 方式一：Cloudflare 自动部署（推荐）

#### 1. Fork 本仓库

点击右上角 `Fork` 按钮，将仓库复制到你的 GitHub 账户。

#### 2. 创建应用

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 `Workers & Pages` → `创建应用程序` (Create Application)
3. 点击 `Connect to Git` (或者 `Continue with GitHub`)
4. 选择你 Fork 的仓库
5. **构建配置**：
   - 保持默认即可，系统会自动识别 `wrangler.toml`
   - 点击 `Save and Deploy`

#### 3. 必要配置环境变量

部署完成后，进入项目详情页：
`设置` (Settings) → `变量和机密` (Variables and Secrets) → `添加` (Add)

| 变量名 | 说明 |
|-------|------|
| `TOKEN` | 订阅访问令牌 |
| `PASSWORD` | 管理页面登录密码 |
| `CLASH_URL` | `https://abc.com` | 仅适配[Clash 转换后端](https://github.com/ryty1/clash-sub-converter) |

#### 4. 绑定 KV（在线编辑用，可选）

1. 进入项目详情页，点击顶部的 `绑定` (Bindings) 选项卡（在部署/Overview旁边）
2. 在 `KV 命名空间` (KV Namespaces) 区域点击 `添加绑定` (Add Binding)
3. 配置绑定：
   - 变量名称 (Variable name)：`KV`
   - KV 命名空间 (KV Namespace)：选择现有或新建一个
4. 点击 `保存` (Save)
5. 保存后需要**重新部署**一次才能生效（部署 -> 重试部署）

**方法二：wrangler.toml 配置**

编辑 `wrangler.toml`，取消 KV 配置的注释并填入 ID：

```toml
[[kv_namespaces]]
binding = "KV"
id = "你的KV命名空间ID"
```

---

## 📖 使用说明

### 访问地址

| 功能 | 地址 |
|------|------|
| 管理页面 | `https://your-domain.com/admin` |
| 订阅地址（自适应） | `https://your-domain.com/{TOKEN}` |
| Base64 订阅 | `https://your-domain.com/{TOKEN}?b64` |
| Clash 订阅 | `https://your-domain.com/{TOKEN}?clash` |

### 管理页面

访问 `/admin` 后输入 `PASSWORD` 登录，可以：

- 查看和复制订阅链接
- 查看访客订阅链接
- 在线编辑节点/订阅源

### 添加节点

在编辑器中，每行一个链接：

```
# 直接节点
vless://uuid@server:port?security=tls&sni=example.com#节点名称
vmess://base64编码内容
trojan://password@server:port?sni=example.com#节点名称
ss://base64编码@server:port#节点名称

# 订阅链接（会自动解析）
https://example.com/subscribe
```

支持的订阅格式：
- Base64 编码的节点列表
- Clash YAML 配置
- Singbox JSON 配置
- 明文节点 URI 列表

---

## ⚙️ 可选全部环境变量

| 变量名 | 默认值 | 说明 |
|-------|--------|------|
| `SUBNAME` | `SerokVip` | 订阅文件名 |
| `SUBUPTIME` | `6` | 订阅更新间隔（小时） |
| `GUESTTOKEN` / `GUEST` | 自动生成 | 访客订阅令牌 |
| `LINK` | - | 节点链接（无 KV 时使用） |
| `LINKSUB` | - | 额外订阅链接 |
| `URL302` | - | 无效访问 302 跳转地址 |
| `URL` | - | 无效访问反代地址 |
| `TGTOKEN` | - | Telegram Bot Token |
| `TGID` | - | Telegram Chat ID |
| `TG` | `0` | 是否推送所有访问（开发者用） |

---

## 🔧 Clash 转换后端

本项目使用独立的 [clash-sub-converter](https://github.com/ryty1/clash-sub-converter) 项目作为 Clash 格式转换后端。

需自建，请参考 `README.md`。

---

## 📝 更新日志

### v2.0
- 仅保留 Base64 和 Clash 两种输出格式
- 新增 HTTPS 订阅智能解析（支持 Clash YAML、Singbox JSON）
- 新增独立登录密码（PASSWORD 变量）
- 新增 `/admin` 管理入口
- 全新深色主题 UI
- 适配手机显示
- 修复节点顺序问题

---
