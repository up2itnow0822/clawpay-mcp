/**
 * shared/ui.ts — Console output helpers
 *
 * Colored status, cost display, and human-in-the-loop approval prompts.
 * All three value packs import from here for consistent UX.
 */
import * as readline from 'readline';

// ─── ANSI color codes ──────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// ─── Core helpers ──────────────────────────────────────────────────────────

export function bold(s: string): string {
  return `${C.bold}${s}${C.reset}`;
}

export function dim(s: string): string {
  return `${C.dim}${s}${C.reset}`;
}

export function colorize(color: keyof typeof C, s: string): string {
  return `${C[color]}${s}${C.reset}`;
}

// ─── Status line printers ──────────────────────────────────────────────────

export function printHeader(title: string): void {
  const line = '═'.repeat(60);
  console.log(`\n${C.cyan}${C.bold}${line}${C.reset}`);
  console.log(`${C.cyan}${C.bold}  ${title}${C.reset}`);
  console.log(`${C.cyan}${C.bold}${line}${C.reset}\n`);
}

export function printSection(title: string): void {
  console.log(`\n${C.blue}${C.bold}── ${title} ──${C.reset}`);
}

export function printStep(step: number, total: number, description: string): void {
  console.log(`${C.gray}[${step}/${total}]${C.reset} ${C.bold}${description}${C.reset}`);
}

export function printInfo(label: string, value: string): void {
  console.log(`  ${C.gray}${label.padEnd(18)}${C.reset}${value}`);
}

export function printSuccess(message: string): void {
  console.log(`${C.green}  ✓${C.reset} ${message}`);
}

export function printWarning(message: string): void {
  console.log(`${C.yellow}  ⚠${C.reset} ${message}`);
}

export function printError(message: string): void {
  console.log(`${C.red}  ✗${C.reset} ${message}`);
}

export function printFree(label: string): void {
  console.log(`  ${C.green}[FREE]${C.reset} ${label}`);
}

export function printPaid(label: string, costUsd: number): void {
  console.log(`  ${C.yellow}[PAID $${costUsd.toFixed(4)}]${C.reset} ${label}`);
}

export function printSpinner(message: string): ReturnType<typeof setInterval> {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  process.stdout.write(`  ${C.cyan}${frames[0]}${C.reset} ${message}`);
  const timer = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r  ${C.cyan}${frames[i]}${C.reset} ${message}`);
  }, 80);
  return timer;
}

export function clearSpinner(timer: ReturnType<typeof setInterval>): void {
  clearInterval(timer);
  process.stdout.write('\r');
}

// ─── Cost display ──────────────────────────────────────────────────────────

export function formatCost(usd: number): string {
  if (usd === 0) return `${C.green}FREE${C.reset}`;
  return `${C.yellow}$${usd.toFixed(4)}${C.reset}`;
}

export function printCostBreakdown(breakdown: {
  freeSources: number;
  paidSources: number;
  totalCostUsd: number;
}): void {
  printSection('Cost Summary');
  printInfo('Free sources:', `${breakdown.freeSources} call${breakdown.freeSources !== 1 ? 's' : ''}`);
  printInfo('Paid sources:', `${breakdown.paidSources} call${breakdown.paidSources !== 1 ? 's' : ''}`);
  printInfo('Total spent:', formatCost(breakdown.totalCostUsd));
}

export function printBudgetStatus(used: number, cap: number): void {
  const pct = cap > 0 ? (used / cap) * 100 : 0;
  const bar = buildProgressBar(pct, 20);
  const color = pct > 80 ? C.red : pct > 50 ? C.yellow : C.green;
  console.log(`\n  Budget: ${color}${bar}${C.reset} ${color}$${used.toFixed(4)} / $${cap.toFixed(2)}${C.reset}`);
}

function buildProgressBar(pct: number, width: number): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

// ─── Human-in-the-loop approval ────────────────────────────────────────────

export interface ApprovalRequest {
  action: string;
  description: string;
  costUsd: number;
  endpoint?: string;
  details?: Record<string, string>;
}

/**
 * Prompt the user for approval before spending money.
 * Returns true if approved, false if denied.
 * This is the core human-in-the-loop gate — NEVER bypass it for paid actions.
 */
export async function requestApproval(req: ApprovalRequest): Promise<boolean> {
  console.log(`\n${C.yellow}${C.bold}┌─ Payment Approval Required ────────────────────────────┐${C.reset}`);
  console.log(`${C.yellow}│${C.reset}  ${C.bold}Action:${C.reset}   ${req.action}`);
  console.log(`${C.yellow}│${C.reset}  ${C.bold}Details:${C.reset}  ${req.description}`);
  if (req.endpoint) {
    console.log(`${C.yellow}│${C.reset}  ${C.bold}Endpoint:${C.reset} ${C.dim}${req.endpoint}${C.reset}`);
  }
  if (req.details) {
    for (const [k, v] of Object.entries(req.details)) {
      console.log(`${C.yellow}│${C.reset}  ${C.bold}${k}:${C.reset} ${v}`);
    }
  }
  console.log(`${C.yellow}│${C.reset}`);
  console.log(`${C.yellow}│${C.reset}  ${C.bold}Cost:${C.reset} ${C.yellow}$${req.costUsd.toFixed(4)} USD${C.reset}`);
  console.log(`${C.yellow}└────────────────────────────────────────────────────────┘${C.reset}`);

  const answer = await prompt('  Approve? [y/N] ');
  const approved = answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';

  if (approved) {
    printSuccess('Approved — proceeding with payment.');
  } else {
    printWarning('Denied — skipping this endpoint.');
  }

  return approved;
}

/**
 * Prompt the user for a plan approval before starting a paid workflow.
 */
export async function requestPlanApproval(plan: {
  steps: Array<{ name: string; cost: number; free: boolean }>;
  totalCostUsd: number;
  dailyCapUsd: number;
}): Promise<boolean> {
  console.log(`\n${C.blue}${C.bold}┌─ Execution Plan ────────────────────────────────────────┐${C.reset}`);
  plan.steps.forEach((step, i) => {
    const costStr = step.free
      ? `${C.green}FREE${C.reset}`
      : `${C.yellow}$${step.cost.toFixed(4)}${C.reset}`;
    console.log(`${C.blue}│${C.reset}  ${C.gray}${i + 1}.${C.reset} ${step.name.padEnd(35)} ${costStr}`);
  });
  console.log(`${C.blue}│${C.reset}`);
  console.log(`${C.blue}│${C.reset}  ${C.bold}Total estimated cost:${C.reset} ${C.yellow}$${plan.totalCostUsd.toFixed(4)}${C.reset}`);
  console.log(`${C.blue}│${C.reset}  ${C.bold}Daily cap:${C.reset} ${C.gray}$${plan.dailyCapUsd.toFixed(2)}${C.reset}`);
  console.log(`${C.blue}└────────────────────────────────────────────────────────┘${C.reset}`);

  if (plan.totalCostUsd > plan.dailyCapUsd) {
    printError(`Estimated cost $${plan.totalCostUsd.toFixed(4)} exceeds daily cap $${plan.dailyCapUsd.toFixed(2)}.`);
    printError('Aborting. Raise your DAILY_CAP_USD or reduce the number of paid sources.');
    return false;
  }

  const answer = await prompt('\n  Execute this plan? [y/N] ');
  return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
}

// ─── readline helper ───────────────────────────────────────────────────────

let _rl: readline.Interface | null = null;

export function getReadline(): readline.Interface {
  if (!_rl) {
    _rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return _rl;
}

export function closeReadline(): void {
  if (_rl) {
    _rl.close();
    _rl = null;
  }
}

export function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = getReadline();
    rl.question(question, resolve);
  });
}

// ─── Ctrl+C handler ───────────────────────────────────────────────────────

export function installShutdownHandler(onShutdown: () => void): void {
  let called = false;
  const handler = () => {
    if (called) return;
    called = true;
    console.log(`\n\n${C.yellow}  Ctrl+C received — shutting down gracefully...${C.reset}`);
    closeReadline();
    onShutdown();
    process.exit(0);
  };
  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
}
