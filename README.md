## MCP 配置文件

```
{
  "mcpServers": {
    "mongodb": {
      "command": "node",
      "args": [
        "E:\\project\\mongodb\\build\\index2.js"
      ],
      "env": {
        "MONGO_URI": "mongodb://localhost:27017/"
      },
      "disabled": false,
      "autoApprove": []
    },
  }
}
```

## 读取资源请求示例：

<use_mcp_tool>
<server_name>mongodb</server_name>
<tool_name>read_resource</tool_name>

{
"uri": "mongodb://localhost:27017/common"
}

</use_mcp_tool>

## CallToolRequestSchema、ReadResourceRequestSchema 的区别

CallToolRequestSchema：
用于执行特定操作
适合执行命令、处理数据等主动操作
示例：获取集合列表、插入数据等

ReadResourceRequestSchema：
用于读取资源内容
适合提供对资源的只读访问
示例：读取集合文档、获取数据库状态等

## 多表联查示例

<use_mcp_tool>
<server_name>mongodb</server_name>
<tool_name>multi_collection_query</tool_name>

{
"database": "common",
"collection": "players",
"pipeline": [
{
"$lookup": {
"from": "platform",
"localField": "platform",
"foreignField": "appKey",
"as": "platformInfo"
}
},
{
"$unwind": "$platformInfo"
},
{
"$project": {
"_id": 1,
"pid": 1,
"__v": 1,
"bank": 1,
"ip": 1,
"lobbyUrl": 1,
"platform": "$platformInfo",
"rtp": 1,
"_collection": { "$literal": "players" }
}
},
{
"$limit": 2
}
]
}

</use_mcp_tool>
