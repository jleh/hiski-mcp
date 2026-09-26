#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { luoPalvelin } from "./server.js";

// Runs the Hiski MCP server over stdio, as MCP clients launch local servers.
await luoPalvelin().connect(new StdioServerTransport());
