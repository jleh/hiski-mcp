import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { HiskiClient } from "./client.js";
import { virheViesti } from "./muotoilu.js";
import { OHJEET } from "./ohjeet.js";
import { TYOKALUT, type Tyokalu } from "./tyokalut.js";
import { SERVER_NAME, SERVER_VERSION } from "./version.js";

/** Creates the Hiski MCP server; the client is injectable for tests. */
export function luoPalvelin(hiski: HiskiClient = new HiskiClient()): McpServer {
  const palvelin = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: OHJEET },
  );
  for (const tyokalu of TYOKALUT) rekisteroi(palvelin, tyokalu, hiski);
  return palvelin;
}

function rekisteroi(palvelin: McpServer, tyokalu: Tyokalu, hiski: HiskiClient) {
  palvelin.registerTool(
    tyokalu.nimi,
    {
      title: tyokalu.otsikko,
      description: tyokalu.kuvaus,
      inputSchema: tyokalu.skeema,
      annotations: {
        title: tyokalu.otsikko,
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: tyokalu.verkko,
      },
    },
    async (args, extra): Promise<CallToolResult> => {
      try {
        const vastaus = await tyokalu.kasittele(args, { hiski, signal: extra.signal });
        return { content: [{ type: "text", text: JSON.stringify(vastaus) }] };
      } catch (virhe) {
        return {
          isError: true,
          content: [{ type: "text", text: virheViesti(virhe) }],
        };
      }
    },
  );
}
