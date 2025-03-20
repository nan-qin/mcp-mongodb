import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { MongoClient } from "mongodb";
import ExcelJS from "exceljs";
// 从环境变量获取MongoDB连接URI
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27018/";
const client = await MongoClient.connect(mongoUri);

// Create server instance
const server = new Server(
  {
    name: "mongodb",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {
        "mongodb://{db}/{collection}": {
          description: "MongoDB集合资源",
          mimeType: "application/json",
        },
      },
      tools: {
        get_collections: {
          description: "获取MongoDB数据库集合",
          inputSchema: {
            type: "object",
            properties: {
              database: {
                type: "string",
                description: "数据库名称",
              },
            },
            required: ["database"],
          },
        },
        multi_collection_query: {
          description: "多集合联查并返回特定数据",
          inputSchema: {
            type: "object",
            properties: {
              database: { type: "string" },
              collection: { type: "string" },
              pipeline: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["database", "collection"],
          },
        },
        export_to_excel: {
          description: "查询数据并导出为Excel文件",
          inputSchema: {
            type: "object",
            properties: {
              database: { type: "string" },
              collection: { type: "string" },
              pipeline: {
                type: "array",
                items: { type: "object" },
              },
              outputPath: { type: "string" },
            },
            required: ["database", "collection", "outputPath"],
          },
        },
      },
    },
  }
);

// <use_mcp_tool>
// <server_name>mongodb</server_name>
// <tool_name>read_resource</tool_name>
// <arguments>
// {
//   "uri": "mongodb://common/players"
// }
// </arguments>
// </use_mcp_tool>
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  console.log(
    "ReadResourceRequestSchema handler called with request:",
    request
  );

  const uriParts = request.params.uri.split("/");
  const dbName = uriParts[3];
  const collectionName = uriParts[4];

  console.log("Database name:", dbName);
  console.log("Collection name:", collectionName);

  const db = client.db(dbName);
  const collection = db.collection(collectionName);
  const documents = await collection.find({}).toArray();

  console.log(documents);
  // return {
  //   resources: collections.map((row) => ({
  //     uri: new URL(`${row.name}/schema`, `mongodb://localhost:27017/`).href,
  //     mimeType: "application/json",
  //     name: `"${row.name}" database schema`,
  //   })),
  // };
  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(documents),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!request.params.arguments) {
    throw new McpError(ErrorCode.InvalidParams, "Missing arguments in request");
  }
  const database: any = request.params.arguments.database;
  if (request.params.name === "get_collections") {
    const collections = await client.db(database).listCollections().toArray();
    // return {
    //   content: collections.map((collection) => collection.name),
    // };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(collections, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "multi_collection_query") {
    // <use_mcp_tool>
    // <server_name>mongodb</server_name>
    // <tool_name>multi_collection_query</tool_name>

    // {
    // "database": "common",
    // "collections": ["players", "teams", "matches"],
    // "fields": ["name", "score", "date"],
    // "match": {
    // "score": { "$gt": 100 },
    // "date": { "$gte": "2025-01-01" }
    // },
    // "sort": { "score": -1 },
    // "limit": 10
    // }
    // </use_mcp_tool>

    // const { database, collections, fields, match } = request.params.arguments;

    const collection: any = request.params.arguments.collection;
    const pipeline: any = request.params.arguments.pipeline;

    const db = client.db(database);

    try {
      // 确保pipeline是数组
      if (!Array.isArray(pipeline)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Pipeline must be an array"
        );
      }

      // 执行aggregate pipeline
      const cursor = db.collection(collection).aggregate(pipeline);
      const results = await cursor.toArray();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(ErrorCode.InternalError, error.message);
    }
  }

  if (request.params.name === "export_to_excel") {
    const collection: any = request.params.arguments.collection;
    const pipeline: any = request.params.arguments.pipeline;
    const outputPath: any = request.params.arguments.outputPath;

    const db = client.db(database);

    // 执行查询
    const cursor = db.collection(collection).aggregate(pipeline);
    const data = await cursor.toArray();

    // 创建Excel文件
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    // 添加表头
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // 添加数据行
      data.forEach((item) => {
        const row = headers.map((header) => item[header]);
        worksheet.addRow(row);
      });
    }

    // 保存文件
    await workbook.xlsx.writeFile(outputPath);

    return {
      content: [
        {
          type: "text",
          text: `数据已成功导出到 ${outputPath}`,
        },
      ],
    };
  }

  throw new McpError(
    ErrorCode.MethodNotFound,
    `Unknown tool: ${request.params.name}`
  );
});

async function runServer() {
  console.log("Server connected");
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);
