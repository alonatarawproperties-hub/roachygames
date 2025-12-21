import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface StockfishOptions {
  skillLevel?: number; // 0-20
  elo?: number; // 1350-3190 (overrides skillLevel if set)
  thinkTimeMs?: number; // Move time limit
  depth?: number; // Search depth limit
}

interface EngineMove {
  move: string; // UCI format like "e2e4"
  thinkTimeMs: number;
  evaluation?: number;
  depth?: number;
}

const BOT_DIFFICULTIES = {
  rookie: { skillLevel: 3, elo: 1350, name: "Rookie Roachy" },
  club: { skillLevel: 8, elo: 1600, name: "Club Roachy" },
  expert: { skillLevel: 14, elo: 2000, name: "Expert Roachy" },
  magnus: { skillLevel: 20, elo: 2800, name: "Magnus" },
} as const;

type BotDifficulty = keyof typeof BOT_DIFFICULTIES;

class StockfishEngine {
  private process: ChildProcess | null = null;
  private isReady: boolean = false;
  private responseBuffer: string = '';
  private pendingResolve: ((value: string) => void) | null = null;
  private currentSkillLevel: number = 20;
  private currentElo: number | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const stockfishPath = require.resolve('stockfish/src/stockfish-nnue-16.js');
        
        this.process = spawn('node', [stockfishPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        if (!this.process.stdout || !this.process.stdin) {
          reject(new Error('Failed to create Stockfish process'));
          return;
        }

        this.process.stdout.on('data', (data: Buffer) => {
          const text = data.toString();
          this.responseBuffer += text;
          
          if (this.pendingResolve && (
            text.includes('uciok') || 
            text.includes('readyok') || 
            text.includes('bestmove')
          )) {
            this.pendingResolve(this.responseBuffer);
            this.responseBuffer = '';
            this.pendingResolve = null;
          }
        });

        this.process.stderr?.on('data', (data: Buffer) => {
          console.error('[Stockfish Error]', data.toString());
        });

        this.process.on('error', (err) => {
          console.error('[Stockfish Process Error]', err);
        });

        this.process.on('close', (code) => {
          console.log(`[Stockfish] Process exited with code ${code}`);
          this.isReady = false;
        });

        this.sendCommand('uci').then(() => {
          this.sendCommand('isready').then(() => {
            this.isReady = true;
            console.log('[Stockfish] Engine initialized');
            resolve();
          });
        });

      } catch (error) {
        console.error('[Stockfish] Initialization error:', error);
        reject(error);
      }
    });
  }

  private sendCommand(command: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.process?.stdin) {
        resolve('');
        return;
      }
      
      this.pendingResolve = resolve;
      this.responseBuffer = '';
      this.process.stdin.write(command + '\n');
      
      setTimeout(() => {
        if (this.pendingResolve) {
          this.pendingResolve(this.responseBuffer);
          this.responseBuffer = '';
          this.pendingResolve = null;
        }
      }, 5000);
    });
  }

  async setDifficulty(difficulty: BotDifficulty): Promise<void> {
    const settings = BOT_DIFFICULTIES[difficulty];
    await this.setSkillLevel(settings.skillLevel);
    await this.setElo(settings.elo);
    console.log(`[Stockfish] Difficulty set to ${settings.name} (ELO: ${settings.elo})`);
  }

  async setSkillLevel(level: number): Promise<void> {
    const clampedLevel = Math.max(0, Math.min(20, level));
    this.currentSkillLevel = clampedLevel;
    await this.sendCommand(`setoption name Skill Level value ${clampedLevel}`);
  }

  async setElo(elo: number): Promise<void> {
    const clampedElo = Math.max(1350, Math.min(3190, elo));
    this.currentElo = clampedElo;
    await this.sendCommand('setoption name UCI_LimitStrength value true');
    await this.sendCommand(`setoption name UCI_Elo value ${clampedElo}`);
  }

  async getBestMove(fen: string, options: StockfishOptions = {}): Promise<EngineMove | null> {
    if (!this.isReady) {
      console.warn('[Stockfish] Engine not ready, initializing...');
      await this.initialize();
    }

    const startTime = Date.now();
    const thinkTimeMs = options.thinkTimeMs || 2000;
    const depth = options.depth || 15;

    if (options.skillLevel !== undefined) {
      await this.setSkillLevel(options.skillLevel);
    }
    if (options.elo !== undefined) {
      await this.setElo(options.elo);
    }

    await this.sendCommand('ucinewgame');
    await this.sendCommand(`position fen ${fen}`);
    
    const goCommand = `go movetime ${thinkTimeMs} depth ${depth}`;
    const response = await this.sendCommand(goCommand);
    
    const bestMoveMatch = response.match(/bestmove\s+(\w+)/);
    if (!bestMoveMatch) {
      console.error('[Stockfish] No bestmove found in response:', response);
      return null;
    }

    const move = bestMoveMatch[1];
    const actualThinkTime = Date.now() - startTime;
    
    const evalMatch = response.match(/score cp (-?\d+)/);
    const depthMatch = response.match(/info depth (\d+)/);
    
    const humanizedThinkTime = Math.max(actualThinkTime, 1500 + Math.random() * 1000);

    console.log(`[Stockfish] Best move: ${move} (think: ${actualThinkTime}ms, ELO: ${this.currentElo || 'max'})`);

    return {
      move,
      thinkTimeMs: humanizedThinkTime,
      evaluation: evalMatch ? parseInt(evalMatch[1]) : undefined,
      depth: depthMatch ? parseInt(depthMatch[1]) : undefined,
    };
  }

  async shutdown(): Promise<void> {
    if (this.process) {
      await this.sendCommand('quit');
      this.process.kill();
      this.process = null;
      this.isReady = false;
      console.log('[Stockfish] Engine shut down');
    }
  }
}

let engineInstance: StockfishEngine | null = null;

export async function getStockfishEngine(): Promise<StockfishEngine> {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
    await engineInstance.initialize();
  }
  return engineInstance;
}

export async function makeStockfishMove(
  fen: string, 
  difficulty: BotDifficulty = 'magnus'
): Promise<EngineMove | null> {
  try {
    const engine = await getStockfishEngine();
    await engine.setDifficulty(difficulty);
    return await engine.getBestMove(fen, { thinkTimeMs: 2000 });
  } catch (error) {
    console.error('[Stockfish] Error making move:', error);
    return null;
  }
}

export { BOT_DIFFICULTIES, BotDifficulty, EngineMove, StockfishOptions };
