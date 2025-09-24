# Chrome DevTools MCP 集成方案

## 为CSS Anchor Positioning调试优化的部署

### 快速集成步骤

1. **Python环境准备**
```bash
# 安装Python 3.11+ (当前3.9.6不支持)
brew install python@3.11
alias python3=/opt/homebrew/bin/python3.11
```

2. **安装chrome-devtools-mcp**
```bash
pip3.11 install chrome-devtools-mcp
```

3. **添加到Claude Flow MCP配置**
```bash
# 方法1: 通过claude命令
claude mcp add chrome-devtools chrome-devtools-mcp

# 方法2: 手动编辑配置文件
vim ~/.claude/claude_desktop_config.json
```

4. **配置示例**
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "chrome-devtools-mcp",
      "args": [],
      "env": {}
    },
    "claude-flow": {
      "command": "npx",
      "args": ["claude-flow@alpha", "mcp", "start"]
    }
  }
}
```

### 调试CSS Anchor Positioning的优化配置

```bash
# 启动Chrome用于调试
chrome-devtools-mcp --port 9222 --headless=false

# 在Claude Code中使用
mcp__chrome-devtools__start_browser
mcp__chrome-devtools__navigate "file:///Users/liuyuyan/Development/claude-flow-workspace/pure-css-anchor-test.html"
mcp__chrome-devtools__get_console_logs
mcp__chrome-devtools__analyze_css_computed_styles
```

### 与Claude Flow协同工作流程

1. **启动调试会话**
   - 使用chrome-devtools-mcp打开页面
   - 同时运行claude-flow性能监控
   
2. **实时CSS调试**
   - 监控CSS规则应用状态
   - 检查anchor-name属性设置
   - 分析polyfill加载情况

3. **综合分析**
   - 结合Claude Flow的性能指标
   - Chrome DevTools的详细调试信息
   - AI辅助问题诊断

## 推荐部署策略

**对于CSS Anchor Positioning调试**:
- 方案1 (CLI集成) + Chrome扩展调试
- 实时监控 + AI分析相结合
- 与现有claude-flow工作流无缝集成