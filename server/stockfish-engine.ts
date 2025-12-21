import { spawn, ChildProcess } from 'child_process';

interface StockfishOptions {
  skillLevel?: number;
  elo?: number;
  thinkTimeMs?: number;
  depth?: number;
}

interface EngineMove {
  move: string;
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
  private currentDifficulty: BotDifficulty | null = null;

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
          this.currentDifficulty = null;
        });

        this.sendCommandWait('uci').then(() => {
          this.sendCommandWait('isready').then(() => {
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

  private sendCommandNoWait(command: string): void {
    if (!this.process?.stdin) return;
    this.process.stdin.write(command + '\n');
  }

  private sendCommandWait(command: string): Promise<string> {
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
      }, 10000);
    });
  }

  private async setDifficulty(difficulty: BotDifficulty): Promise<void> {
    if (this.currentDifficulty === difficulty) {
      return;
    }
    
    const settings = BOT_DIFFICULTIES[difficulty];
    
    this.sendCommandNoWait(`setoption name Skill Level value ${settings.skillLevel}`);
    this.sendCommandNoWait('setoption name UCI_LimitStrength value true');
    this.sendCommandNoWait(`setoption name UCI_Elo value ${settings.elo}`);
    
    await this.sendCommandWait('isready');
    
    this.currentDifficulty = difficulty;
    console.log(`[Stockfish] Difficulty set to ${settings.name} (ELO: ${settings.elo})`);
  }

  async getBestMove(fen: string, difficulty: BotDifficulty, thinkTimeMs: number = 2000): Promise<EngineMove | null> {
    if (!this.isReady) {
      console.warn('[Stockfish] Engine not ready, initializing...');
      await this.initialize();
    }

    const startTime = Date.now();
    
    await this.setDifficulty(difficulty);

    this.sendCommandNoWait('ucinewgame');
    this.sendCommandNoWait(`position fen ${fen}`);
    
    const response = await this.sendCommandWait(`go movetime ${thinkTimeMs}`);
    
    const bestMoveMatch = response.match(/bestmove\s+(\w+)/);
    if (!bestMoveMatch) {
      console.error('[Stockfish] No bestmove found in response');
      return null;
    }

    const move = bestMoveMatch[1];
    const actualThinkTime = Date.now() - startTime;
    
    const evalMatch = response.match(/score cp (-?\d+)/);
    const depthMatch = response.match(/info depth (\d+)/);
    
    const humanizedThinkTime = Math.max(actualThinkTime, 1500 + Math.random() * 1000);

    console.log(`[Stockfish] Best move: ${move} (${actualThinkTime}ms, ${difficulty})`);

    return {
      move,
      thinkTimeMs: humanizedThinkTime,
      evaluation: evalMatch ? parseInt(evalMatch[1]) : undefined,
      depth: depthMatch ? parseInt(depthMatch[1]) : undefined,
    };
  }

  async shutdown(): Promise<void> {
    if (this.process) {
      this.sendCommandNoWait('quit');
      this.process.kill();
      this.process = null;
      this.isReady = false;
      this.currentDifficulty = null;
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
    return await engine.getBestMove(fen, difficulty, 2000);
  } catch (error) {
    console.error('[Stockfish] Error making move:', error);
    return null;
  }
}

export { BOT_DIFFICULTIES, BotDifficulty, EngineMove, StockfishOptions };
