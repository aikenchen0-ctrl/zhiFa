# MCP Chrome 安装配置指南

## 安装状态

✅ **已完成的步骤**：
- Node.js v22.19.0 (满足 >=18.19.0 要求)
- pnpm 包管理器已安装并配置
- mcp-chrome-bridge v1.0.29 已全局安装
- Native Messaging Host 已注册
- Chrome 扩展 chrome-mcp-server 0.0.6 已安装
- Claude MCP 配置已存在

## Chrome 扩展配置

1. 在 Chrome 中打开 `chrome://extensions/`
2. 确保已启用"开发者模式"
3. 确认 chrome-mcp-server 扩展已安装并启用
4. 点击扩展图标进行配置

## MCP 连接配置

**推荐连接方式**: Streamable HTTP
- URL: `http://127.0.0.1:12306/mcp`
- 在扩展中选择此连接方式

**备选连接方式**: STDIO
- 使用已注册的 Native Messaging Host
- 路径: `/Users/liuyuyan/Library/pnpm/global/5/.pnpm/mcp-chrome-bridge@1.0.29/node_modules/mcp-chrome-bridge/dist/run_host.sh`

## 使用方法

安装完成后，你将拥有 20+ 浏览器自动化工具，包括：

### 浏览器控制
- `start_chrome` - 启动 Chrome 浏览器
- `connect_to_browser` - 连接到现有浏览器实例
- `navigate_to_url` - 导航到指定 URL
- `get_page_info` - 获取页面信息

### DOM 操作
- `get_document` - 获取 DOM 文档结构
- `query_selector` - 查找页面元素
- `get_element_attributes` - 获取元素属性
- `execute_javascript` - 执行 JavaScript 代码

### 网络监控
- `get_network_requests` - 获取网络请求
- `get_network_response` - 获取响应数据
- `get_console_logs` - 获取控制台日志

### CSS 样式分析
- `get_computed_styles` - 获取计算样式
- `get_matched_styles` - 获取匹配的 CSS 规则
- `start_css_coverage_tracking` - CSS 覆盖率分析

### 存储管理
- `get_all_cookies` - 获取所有 Cookie
- `set_cookie` - 设置 Cookie
- `clear_storage_for_origin` - 清理存储数据

## 故障排除

如果遇到连接问题：

1. 确保 Chrome 扩展已正确安装并启用
2. 检查 MCP bridge 是否正在运行：
   ```bash
   ps aux | grep mcp-chrome-bridge
   ```

3. 重启 Chrome 浏览器
4. 重新配置扩展连接设置

## 测试安装

在 Claude Code 中使用以下命令测试：

```bash
# 检查 MCP 服务器状态
claude mcp list

# 测试浏览器连接 (如果有相关工具可用)
```

## 系统文件位置

- **全局 pnpm 目录**: `/Users/liuyuyan/Library/pnpm`
- **MCP Chrome Bridge**: `/Users/liuyuyan/Library/pnpm/global/5/.pnpm/mcp-chrome-bridge@1.0.29`
- **Native Messaging Host**: `/Users/liuyuyan/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.chromemcp.nativehost.json`

安装完成！现在你可以通过 Claude Code 控制和自动化 Chrome 浏览器了。