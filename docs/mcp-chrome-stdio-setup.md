# MCP Chrome STDIO 连接方式

由于 HTTP 连接初始化遇到问题，可以使用 STDIO 连接方式作为替代方案。

## 配置步骤

根据 pnpm 安装路径，MCP Chrome Bridge 的路径应该是：
`/Users/liuyuyan/Library/pnpm/global/5/node_modules/mcp-chrome-bridge/dist/mcp/mcp-server-stdio.js`

## Claude Code 配置

使用以下命令添加 STDIO 连接：

```bash
claude mcp add chrome-stdio node /Users/liuyuyan/Library/pnpm/global/5/node_modules/mcp-chrome-bridge/dist/mcp/mcp-server-stdio.js
```

## 备选方案

如果上述路径不正确，请使用以下命令查找正确路径：
```bash
find ~/Library/pnpm -name "mcp-server-stdio.js" -type f 2>/dev/null
```

然后使用找到的路径配置 MCP 服务器。

## 注意事项

- STDIO 连接不需要 HTTP 服务器
- 直接通过 Native Messaging 与扩展通信
- 需要确保 Chrome 扩展已正确加载并启用