#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { db } from './db/connection.js';
import { getLikedSongsCount, getLikedSongsCountSchema } from './tools/getLikedSongsCount.js';
import { getSyncStatus, getSyncStatusSchema } from './tools/getSyncStatus.js';
import { syncLikedSongs, syncLikedSongsSchema } from './tools/syncLikedSongs.js';
import { searchLikedSongs, searchLikedSongsSchema } from './tools/searchLikedSongs.js';

// Create MCP server instance
const server = new Server(
  {
    name: 'swaddle-spotify-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool registry
const tools = [
  getLikedSongsCountSchema,
  getSyncStatusSchema,
  syncLikedSongsSchema,
  searchLikedSongsSchema
];

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools
  };
});

// Handler for tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_liked_songs_count': {
        const result = await getLikedSongsCount(args || {});

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${result.error}`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                user: result.displayName || result.userId,
                totalLikedSongs: result.totalLikedSongs,
                lastSynced: result.lastSyncAt,
                syncStatus: result.syncStatus,
                message: `You have ${result.totalLikedSongs} liked songs in your Spotify library`
              }, null, 2)
            }
          ]
        };
      }

      case 'get_sync_status': {
        const result = await getSyncStatus(args || {});

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${result.error}`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'sync_liked_songs': {
        const result = await syncLikedSongs(args || {});

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'search_liked_songs': {
        const result = await searchLikedSongs(args || {});

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${result.error}`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error('Tool execution error:', error);

    if (error instanceof McpError) {
      throw error;
    }

    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Main server initialization
async function main() {
  try {
    // Connect to database
    await db.connect();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    console.error('🚀 Swaddle MCP Server running on stdio');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('\n🛑 Shutting down MCP server...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n🛑 Shutting down MCP server...');
  await db.close();
  process.exit(0);
});

// Start the server
main();
