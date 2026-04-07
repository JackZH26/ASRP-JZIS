# ASRP Desktop — 本地修复指南

## 问题

ASRP Desktop 的 3 个 Discord Agent（Albert, Wall-E, Aria）无法上线。原因是生成的 OpenClaw 配置文件格式错误。

## 环境信息

- macOS
- OpenClaw 已安装：`openclaw --version` → 2026.4.5
- ASRP Desktop 版本：0.1.22 或 0.1.23
- 配置文件路径：`~/.openclaw-asrp-albert/`, `~/.openclaw-asrp-walle/`, `~/.openclaw-asrp-aria/`

## 根因

配置文件中 `channels.discord.guilds.{guildId}` 的值是 `{ "enabled": true }`，但 OpenClaw 不认识 `enabled` 这个字段。正确的格式是 `{ "requireMention": false }`。

## 修复步骤

### Step 1: 修复现有的 3 个配置文件

```bash
# 检查文件是否存在
ls ~/.openclaw-asrp-*/openclaw.json

# 修复：把 "enabled": true 替换为 "requireMention": false
sed -i '' 's/"enabled": true/"requireMention": false/g' ~/.openclaw-asrp-albert/openclaw.json
sed -i '' 's/"enabled": true/"requireMention": false/g' ~/.openclaw-asrp-walle/openclaw.json
sed -i '' 's/"enabled": true/"requireMention": false/g' ~/.openclaw-asrp-aria/openclaw.json
```

### Step 2: 验证配置文件格式

```bash
# 查看修复后的内容（确认 requireMention 替换成功）
cat ~/.openclaw-asrp-albert/openclaw.json
```

期望看到类似：
```json
{
  "agents": {
    "defaults": {
      "workspace": "/Users/jackzhou/asrp-workspace/agent-albert",
      "model": "anthropic/claude-sonnet-4-6"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "...(bot token)...",
      "groupPolicy": "allowlist",
      "guilds": {
        "1489977014503870566": {
          "requireMention": false
        }
      }
    }
  },
  "gateway": {
    "port": 18801
  }
}
```

**注意：** `channels.discord.enabled: true` 是正确的（这是 discord channel 的开关）。只有 `guilds.{id}.enabled` 是错误的。

### Step 3: 手动测试每个 gateway

逐个启动测试：

```bash
# 测试 Albert（端口 18801）
openclaw --profile asrp-albert gateway --port 18801
# 如果启动成功，会显示 "Gateway is running" 之类的信息
# Ctrl+C 停止

# 测试 Wall-E（端口 18802）
openclaw --profile asrp-walle gateway --port 18802
# Ctrl+C 停止

# 测试 Aria（端口 18803）
openclaw --profile asrp-aria gateway --port 18803
# Ctrl+C 停止
```

如果每个都不再报 config error，说明修复成功。

### Step 4: 通过 ASRP Desktop 启动

1. 打开 ASRP Desktop
2. 在 Dashboard 点 "Start Gateway" 按钮
3. 或在 Agents 页面点 "Start All Agents"
4. 等待 15 秒，检查 Discord 里 3 个 bot 是否变成在线状态

### 可能遇到的其他错误

如果 `openclaw --profile asrp-albert gateway --port 18801` 还报其他错误：

1. **"Config not found"** → 需要重新跑 ASRP Desktop 的 Setup（Settings → Re-run Setup）
2. **"Token invalid"** → Discord bot token 过期或错误，需要重新生成
3. **"Port in use"** → 端口被占用，`lsof -i :18801` 查看并 kill 占用进程
4. **需要 auth/pairing** → OpenClaw 可能需要初始化：`openclaw --profile asrp-albert onboard`

## 自动更新到 v0.1.24

v0.1.24 已经修复了这个 config 生成的 bug。更新后重新 Setup 会生成正确的配置。

```bash
# 或手动下载
open https://github.com/JackZH26/ASRP-JZIS/releases/tag/v0.1.24
```
