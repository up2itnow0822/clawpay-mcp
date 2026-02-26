#!/usr/bin/env node
/**
 * ClawPay MCP Server — Entry Point
 *
 * Exposes Agent Wallet SDK tools via the Model Context Protocol (MCP).
 * Compatible with Claude Desktop, Cursor, Windsurf, and any MCP client.
 *
 * v1.1.0 adds x402 V2 session payment support:
 *   - x402_session_start  — pay once, receive a signed session token
 *   - x402_session_fetch  — make N calls within a session (no new payments)
 *   - x402_session_status — inspect active sessions and TTL
 *   - x402_session_end    — close a session explicitly
 *
 * Transport: stdio (standard MCP transport)
 * Config:    AGENT_PRIVATE_KEY + AGENT_WALLET_ADDRESS env vars required
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

// ─── Tool imports (v1.0.0) ─────────────────────────────────────────────────

import { deployWalletTool, handleDeployWallet, DeployWalletSchema } from './tools/deploy.js';
import { getWalletInfoTool, handleGetWalletInfo, GetWalletInfoSchema } from './tools/wallet.js';
import { checkSpendLimitTool, handleCheckSpendLimit, CheckSpendLimitSchema } from './tools/wallet.js';
import { queueApprovalTool, handleQueueApproval, QueueApprovalSchema } from './tools/wallet.js';
import { sendPaymentTool, handleSendPayment, SendPaymentSchema } from './tools/payments.js';
import { x402PayTool, handleX402Pay, X402PaySchema } from './tools/x402.js';
import { getTransactionHistoryTool, handleGetTransactionHistory, GetTransactionHistorySchema } from './tools/history.js';

// ─── Tool imports (v1.1.0 — x402 V2 session payments) ─────────────────────

import {
  x402SessionStartTool,
  handleX402SessionStart,
  X402SessionStartSchema,
  x402SessionFetchTool,
  handleX402SessionFetch,
  X402SessionFetchSchema,
  x402SessionStatusTool,
  handleX402SessionStatus,
  X402SessionStatusSchema,
  x402SessionEndTool,
  handleX402SessionEnd,
  X402SessionEndSchema,
} from './tools/session.js';

// ─── Server configuration ──────────────────────────────────────────────────

const SERVER_INFO = {
  name: 'clawpay-mcp',
  version: '1.1.0',
};

const SERVER_CAPABILITIES = {
  tools: {},
};

// ─── Tool registry ─────────────────────────────────────────────────────────

const ALL_TOOLS = [
  // v1.0.0 tools
  deployWalletTool,
  getWalletInfoTool,
  sendPaymentTool,
  checkSpendLimitTool,
  queueApprovalTool,
  x402PayTool,
  getTransactionHistoryTool,
  // v1.1.0 — x402 V2 session tools
  x402SessionStartTool,
  x402SessionFetchTool,
  x402SessionStatusTool,
  x402SessionEndTool,
];

// ─── Server initialization ─────────────────────────────────────────────────

const server = new Server(SERVER_INFO, {
  capabilities: SERVER_CAPABILITIES,
});

// ─── List tools handler ────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: ALL_TOOLS,
  };
});

// ─── Call tool handler ─────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ── v1.0.0 tools ──────────────────────────────────────────────────

      case 'deploy_wallet': {
        const input = DeployWalletSchema.parse(args);
        return handleDeployWallet(input);
      }

      case 'get_wallet_info': {
        const input = GetWalletInfoSchema.parse(args ?? {});
        return handleGetWalletInfo(input);
      }

      case 'send_payment': {
        const input = SendPaymentSchema.parse(args);
        return handleSendPayment(input);
      }

      case 'check_spend_limit': {
        const input = CheckSpendLimitSchema.parse(args);
        return handleCheckSpendLimit(input);
      }

      case 'queue_approval': {
        const input = QueueApprovalSchema.parse(args);
        return handleQueueApproval(input);
      }

      case 'x402_pay': {
        const input = X402PaySchema.parse(args);
        return handleX402Pay(input);
      }

      case 'get_transaction_history': {
        const input = GetTransactionHistorySchema.parse(args ?? {});
        return handleGetTransactionHistory(input);
      }

      // ── v1.1.0 — x402 V2 session tools ───────────────────────────────

      case 'x402_session_start': {
        const input = X402SessionStartSchema.parse(args);
        return handleX402SessionStart(input);
      }

      case 'x402_session_fetch': {
        const input = X402SessionFetchSchema.parse(args);
        return handleX402SessionFetch(input);
      }

      case 'x402_session_status': {
        const input = X402SessionStatusSchema.parse(args ?? {});
        return handleX402SessionStatus(input);
      }

      case 'x402_session_end': {
        const input = X402SessionEndSchema.parse(args);
        return handleX402SessionEnd(input);
      }

      default:
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ Unknown tool: "${name}". Available tools: ${ALL_TOOLS.map(t => t.name).join(', ')}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `❌ Tool "${name}" failed: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// ─── Start server ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });

  await server.connect(transport);

  // Log to stderr (not stdout — stdout is reserved for MCP protocol)
  process.stderr.write(
    `ClawPay MCP v1.1.0 started. ` +
    `Wallet: ${process.env['AGENT_WALLET_ADDRESS'] ?? '(not configured)'} | ` +
    `Chain: ${process.env['CHAIN_ID'] ?? '8453 (Base Mainnet)'} | ` +
    `Session TTL: ${process.env['SESSION_TTL_SECONDS'] ?? '3600'}s\n`
  );
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Fatal error starting ClawPay MCP: ${msg}\n`);
  process.exit(1);
});
