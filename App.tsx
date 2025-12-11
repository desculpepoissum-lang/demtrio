import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, MazeGrid, Position, LetterItem, WordData, Language, Inventory } from './types';
import { generateMaze, findFreePositions, getNextStepTowards } from './services/mazeService';
import { fetchWordForLevel } from './services/geminiService';
import MazeRender from './components/MazeRender';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RefreshCw, Trophy, BrainCircuit, Skull, Globe, Star, Shield, Sword, Crosshair, ShoppingCart, Drill, FastForward } from 'lucide-react';

// Translations
const UI_TEXT = {
  en: {
    title: "Labyrinth",
    level: "Level",
    score: "Score",
    hint: "Hint",
    hunter: "HUNTER ACTIVE",
    loading: "Generating Level",
    oracle: "Consulting the AI Oracle...",
    complete: "Level Complete!",
    found: "Word found:",
    next: "Next Level",
    skip: "Skip Shop",
    caught: "Caught by the enemy! Restarting level...",
    controls: "Move: Arrow Keys | Shoot: Spacebar",
    restart: "Restart Game",
    selectLang: "Select Language",
    shop: "Merchant",
    buy: "Buy",
    poor: "Not enough points",
    items: {
      shield: "Shield",
      sword: "Sword",
      pistol: "Pistol",
      drill: "Drill"
    },
    desc: {
      shield: "Blocks one hit",
      sword: "Kill enemy on contact",
      pistol: "Ranged kill",
      drill: "Break through walls"
    }
  },
  pt: {
    title: "Labirinto",
    level: "Nível",
    score: "Pontos",
    hint: "Dica",
    hunter: "CAÇADOR ATIVO",
    loading: "Gerando Nível",
    oracle: "Consultando o Oráculo IA...",
    complete: "Nível Completo!",
    found: "Palavra encontrada:",
    next: "Próximo Nível",
    skip: "Pular Loja",
    caught: "Pego pelo inimigo! Reiniciando nível...",
    controls: "Mover: Setas | Atirar: Espaço",
    restart: "Reiniciar Jogo",
    selectLang: "Selecione o Idioma",
    shop: "Mercador",
    buy: "Comprar",
    poor: "Pontos insuficientes",
    items: {
      shield: "Escudo",
      sword: "Espada",
      pistol: "Pistola",
      drill: "Furadeira"
    },
    desc: {
      shield: "Bloqueia um golpe",
      sword: "Mata ao tocar",
      pistol: "Ataque à distância",
      drill: "Quebra paredes"
    }
  }
};

const ITEM_PRICES = {
  shield: 3,
  sword: 4,
  pistol: 5,
  drill: 12
};

const App: React.FC = () => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>(GameState.LANGUAGE_SELECT);
  const [language, setLanguage] = useState<Language>('en'); 
  const [maze, setMaze] = useState<MazeGrid>([]);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 1, y: 1 });
  
  // Enemy State
  const [enemyPos, setEnemyPos] = useState<Position | null>(null);
  const [enemyActive, setEnemyActive] = useState(false);
  const [enemySpeedMult, setEnemySpeedMult] = useState(1.0);
  
  const [letters, setLetters] = useState<LetterItem[]>([]);
  const [targetWord, setTargetWord] = useState<string>('');
  const [wordHint, setWordHint] = useState<string>('');
  const [collectedLetters, setCollectedLetters] = useState<string[]>([]);
  
  // Inventory
  const [inventory, setInventory] = useState<Inventory>({
    shields: 0,
    swords: 0,
    pistols: 0,
    drills: 0
  });

  // Input tracking
  const keysPressed = useRef<Set<string>>(new Set());
  const isRestartingRef = useRef(false);

  // Helper to get current text
  const t = UI_TEXT[language];

  const initializeLevel = useCallback(async (currentLevel: number, lang: Language) => {
    isRestartingRef.current = false;
    setGameState(GameState.LOADING);
    setCollectedLetters([]);
    setPlayerPos({ x: 1, y: 1 });
    
    // Reset enemy for new level
    setEnemyActive(false);
    setEnemyPos(null);
    setEnemySpeedMult(1.0);

    try {
      // 1. Get Word
      const wordData: WordData = await fetchWordForLevel(currentLevel, lang);
      setTargetWord(wordData.word);
      setWordHint(wordData.hint);

      // 2. Generate Maze
      // INCREASED SIZE LOGIC
      const baseSize = 21; // Increased from 15
      const sizeIncrement = Math.floor((currentLevel - 1) / 2) * 2;
      const size = Math.min(baseSize + sizeIncrement, 35); // Increased max from 25 to 35
      
      const newMaze = generateMaze(size, size);
      setMaze(newMaze);

      // 3. Place Letters
      const chars = wordData.word.split('');
      const availableSpots = findFreePositions(newMaze, chars.length + 5); 
      
      const letterSpots = availableSpots.slice(0, chars.length);
      
      const newLetters: LetterItem[] = chars.map((char, index) => ({
        id: `l-${index}`,
        char,
        position: letterSpots[index],
        collected: false
      }));
      setLetters(newLetters);

      // 4. Place Enemy (Level >= 1)
      if (currentLevel >= 1) {
        const candidateSpots = availableSpots.slice(chars.length);
        const bestEnemySpot = getFurthestSpot(candidateSpots, {x:1, y:1});
        if (bestEnemySpot) {
          setEnemyPos(bestEnemySpot);
          setEnemyActive(true);
        }
      }

      setGameState(GameState.PLAYING);
    } catch (e) {
      console.error("Level init error", e);
      setGameState(GameState.ERROR);
    }
  }, []);

  const getFurthestSpot = (spots: Position[], from: Position) => {
    let bestSpot = spots[0];
    let maxDist = 0;
    for (const spot of spots) {
       const dist = Math.abs(spot.x - from.x) + Math.abs(spot.y - from.y);
       if (dist > maxDist) {
         maxDist = dist;
         bestSpot = spot;
       }
    }
    return bestSpot;
  };

  const selectLanguage = (lang: Language) => {
    setLanguage(lang);
    setLevel(1);
    setScore(0);
    setInventory({ shields: 0, swords: 0, pistols: 0, drills: 0 });
    initializeLevel(1, lang);
  };

  const killEnemy = useCallback(() => {
    setEnemyActive(false);
    // Increase speed for respawn
    setEnemySpeedMult(prev => prev + 0.1); // 10% increase

    // Respawn logic
    setTimeout(() => {
      setMaze(currentMaze => {
        const free = findFreePositions(currentMaze, 20);
        setPlayerPos(currPlayerPos => {
           const spawn = getFurthestSpot(free, currPlayerPos) || {x: currentMaze[0].length-2, y: currentMaze.length-2};
           setEnemyPos(spawn);
           setEnemyActive(true);
           return currPlayerPos;
        });
        return currentMaze;
      });
    }, 2000);
  }, []);

  const triggerDeath = useCallback(() => {
    if (isRestartingRef.current) return;
    
    // Check Shield
    if (inventory.shields > 0) {
      setInventory(prev => ({ ...prev, shields: prev.shields - 1 }));
      return; 
    }

    isRestartingRef.current = true;
    alert(UI_TEXT[language].caught);
    setScore(s => Math.max(0, s - collectedLetters.length)); // Deduct run points
    initializeLevel(level, language);
  }, [inventory.shields, language, level, collectedLetters.length, initializeLevel]);


  // Enemy AI Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING || !enemyPos || !enemyActive) return;

    const baseInterval = 600;
    const moveInterval = Math.max(200, baseInterval / enemySpeedMult);

    const intervalId = setInterval(() => {
      setEnemyPos((currentEnemyPos) => {
        if (!currentEnemyPos) return null;

        // Collision Check (Before Move - Enemy hitting Player)
        if (currentEnemyPos.x === playerPos.x && currentEnemyPos.y === playerPos.y) {
          triggerDeath();
          return currentEnemyPos;
        }

        const activeLetterPositions = letters.filter(l => !l.collected).map(l => l.position);
        const nextPos = getNextStepTowards(maze, currentEnemyPos, playerPos, activeLetterPositions);

        // Collision Check (After Move)
        if (nextPos.x === playerPos.x && nextPos.y === playerPos.y) {
          triggerDeath();
        }

        return nextPos;
      });
    }, moveInterval);

    return () => clearInterval(intervalId);
  }, [gameState, maze, playerPos, triggerDeath, enemyPos, enemyActive, enemySpeedMult, letters]);

  // Handle Pistol Shot
  const firePistol = useCallback(() => {
    if (inventory.pistols <= 0 || !enemyActive || !enemyPos) return;

    const isAlignedX = playerPos.x === enemyPos.x;
    const isAlignedY = playerPos.y === enemyPos.y;

    if (isAlignedX || isAlignedY) {
      let clearShot = true;
      if (isAlignedX) {
        const minY = Math.min(playerPos.y, enemyPos.y);
        const maxY = Math.max(playerPos.y, enemyPos.y);
        for (let y = minY + 1; y < maxY; y++) {
          if (maze[y][playerPos.x] === 'wall') clearShot = false;
        }
      } else {
        const minX = Math.min(playerPos.x, enemyPos.x);
        const maxX = Math.max(playerPos.x, enemyPos.x);
        for (let x = minX + 1; x < maxX; x++) {
          if (maze[playerPos.y][x] === 'wall') clearShot = false;
        }
      }

      if (clearShot) {
        setInventory(prev => ({ ...prev, pistols: prev.pistols - 1 }));
        killEnemy();
      }
    }
  }, [inventory.pistols, enemyActive, enemyPos, playerPos, maze, killEnemy]);


  // Movement Logic
  const handleMove = useCallback((dx: number, dy: number) => {
    if (gameState !== GameState.PLAYING) return;

    setPlayerPos((prev) => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;

      // Bounds Check
      if (
        newY < 0 || newY >= maze.length || 
        newX < 0 || newX >= maze[0].length
      ) {
        return prev;
      }

      // Wall / Drill Check
      if (maze[newY][newX] === 'wall') {
        if (inventory.drills > 0) {
          // Use Drill
          setInventory(inv => ({ ...inv, drills: inv.drills - 1 }));
          setMaze(prevMaze => {
            const newGrid = prevMaze.map(row => [...row]);
            newGrid[newY][newX] = 'path';
            return newGrid;
          });
          // Allow the move to proceed to newX, newY
        } else {
          // Blocked
          return prev;
        }
      }

      const newPos = { x: newX, y: newY };

      // Collision check moving INTO enemy
      if (enemyActive && enemyPos && newPos.x === enemyPos.x && newPos.y === enemyPos.y) {
        if (inventory.swords > 0) {
          // Kill Enemy
          setInventory(inv => ({ ...inv, swords: inv.swords - 1 }));
          killEnemy();
          return newPos; // Move into the spot where enemy was
        } else {
          // Die (or shield check inside triggerDeath)
          triggerDeath();
          return prev; 
        }
      }

      // Check letters
      const letterIndex = letters.findIndex(
        l => !l.collected && l.position.x === newX && l.position.y === newY
      );

      if (letterIndex !== -1) {
        const collectedChar = letters[letterIndex].char;
        const updatedLetters = [...letters];
        updatedLetters[letterIndex].collected = true;
        setLetters(updatedLetters);
        
        setScore(s => s + 1);

        setCollectedLetters(prevCollected => {
          const newCollected = [...prevCollected, collectedChar];
          if (updatedLetters.every(l => l.collected)) {
            setTimeout(() => setGameState(GameState.LEVEL_COMPLETE), 300);
          }
          return newCollected;
        });
      }

      return newPos;
    });
  }, [gameState, maze, letters, enemyPos, enemyActive, inventory.swords, inventory.drills, triggerDeath, killEnemy]);

  // Input Loop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      if (e.code === 'Space') {
        firePistol();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const intervalId = setInterval(() => {
      if (gameState !== GameState.PLAYING) return;

      const keys = keysPressed.current;
      let dx = 0;
      let dy = 0;

      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy = -1;
      else if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy = 1;
      else if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx = -1;
      else if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx = 1;

      if (dx !== 0 || dy !== 0) {
        handleMove(dx, dy);
      }
    }, 110); 

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(intervalId);
    };
  }, [gameState, handleMove, firePistol]);

  // Mobile Control Handlers
  const handlePadStart = (key: string, dx: number, dy: number) => {
    if (gameState !== GameState.PLAYING) return;
    keysPressed.current.add(key);
    // Instant move for responsiveness
    handleMove(dx, dy);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handlePadEnd = (key: string) => {
    keysPressed.current.delete(key);
  };

  const nextLevel = () => {
    setLevel(p => {
      const next = p + 1;
      initializeLevel(next, language);
      return next;
    });
  };

  const restartGame = () => {
    setGameState(GameState.LANGUAGE_SELECT);
  };

  const buyItem = (item: 'shield' | 'sword' | 'pistol' | 'drill') => {
    const cost = ITEM_PRICES[item];
    if (score >= cost) {
      setScore(s => s - cost);
      setInventory(prev => ({
        ...prev,
        [item === 'shield' ? 'shields' : item === 'sword' ? 'swords' : item === 'pistol' ? 'pistols' : 'drills']: 
        prev[item === 'shield' ? 'shields' : item === 'sword' ? 'swords' : item === 'pistol' ? 'pistols' : 'drills'] + 1
      }));
    }
  };

  // --- RENDER HELPERS ---

  const renderWordProgress = () => {
    const collectedCounts: Record<string, number> = {};
    collectedLetters.forEach(c => {
      collectedCounts[c] = (collectedCounts[c] || 0) + 1;
    });

    return (
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {targetWord.split('').map((char, idx) => {
          const isCollected = collectedCounts[char] > 0;
          if (isCollected) collectedCounts[char]--; 
          return (
            <div 
              key={idx} 
              className={`w-10 h-12 flex items-center justify-center rounded border-2 font-bold text-xl transition-all duration-300
                ${isCollected 
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(52,211,153,0.5)] scale-110' 
                  : 'bg-slate-800 border-slate-600 text-slate-500'}`}
            >
              {isCollected ? char : '?'}
            </div>
          );
        })}
      </div>
    );
  };

  const renderInventory = () => (
    <div className="flex gap-4 items-center bg-slate-900/80 p-2 rounded-lg border border-slate-700">
      <div className="flex items-center gap-1 text-blue-400" title={t.items.shield}>
        <Shield size={16} /> <span className="font-bold">{inventory.shields}</span>
      </div>
      <div className="flex items-center gap-1 text-orange-400" title={t.items.sword}>
        <Sword size={16} /> <span className="font-bold">{inventory.swords}</span>
      </div>
      <div className="flex items-center gap-1 text-pink-400" title={t.items.pistol}>
        <Crosshair size={16} /> <span className="font-bold">{inventory.pistols}</span>
      </div>
      <div className="flex items-center gap-1 text-yellow-400" title={t.items.drill}>
        <Drill size={16} /> <span className="font-bold">{inventory.drills}</span>
      </div>
    </div>
  );

  // --- SCREENS ---

  if (gameState === GameState.LANGUAGE_SELECT) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-4">
        <Globe className="w-20 h-20 text-cyan-400 mb-6 animate-pulse" />
        <h1 className="text-4xl font-bold mb-8 text-center text-cyan-400 tracking-wider">Labyrinth of Words</h1>
        <p className="mb-8 text-slate-400">Select Language / Selecione o Idioma</p>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
          <button 
            onClick={() => selectLanguage('en')}
            className="flex-1 py-4 bg-slate-800 hover:bg-cyan-900 border border-slate-600 hover:border-cyan-500 rounded-xl transition-all duration-300 group"
          >
            <div className="text-2xl font-bold mb-1 group-hover:text-cyan-400">English</div>
          </button>
          
          <button 
            onClick={() => selectLanguage('pt')}
            className="flex-1 py-4 bg-slate-800 hover:bg-emerald-900 border border-slate-600 hover:border-emerald-500 rounded-xl transition-all duration-300 group"
          >
            <div className="text-2xl font-bold mb-1 group-hover:text-emerald-400">Português</div>
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.LOADING) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-400">
        <BrainCircuit className="w-16 h-16 animate-pulse mb-4" />
        <h2 className="text-2xl font-bold">{t.loading} {level}...</h2>
        <p className="text-slate-400 mt-2 text-sm">{t.oracle}</p>
      </div>
    );
  }

  // Shop / Level Complete Screen
  if (gameState === GameState.LEVEL_COMPLETE) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <Trophy className="w-16 h-16 text-yellow-400 mb-4 drop-shadow-lg" />
        <h1 className="text-3xl font-bold text-white mb-1">{t.complete}</h1>
        <p className="text-slate-400 mb-6">{t.found} <span className="text-emerald-400 font-bold">{targetWord}</span></p>
        
        <div className="flex items-center gap-2 mb-6 text-2xl font-bold text-yellow-400 bg-slate-800 px-6 py-3 rounded-full border border-yellow-400/30">
          <Star className="fill-yellow-400 text-yellow-400" />
          <span>{score}</span>
        </div>

        {/* SHOP UI */}
        <div className="w-full max-w-lg flex justify-end mb-2">
            <button 
              onClick={nextLevel} 
              className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition group"
            >
              {t.skip} <FastForward size={14} className="group-hover:translate-x-1 transition-transform"/>
            </button>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-lg mb-8 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-center gap-2 mb-4 text-cyan-300">
            <ShoppingCart />
            <h2 className="text-xl font-bold tracking-widest uppercase">{t.shop}</h2>
          </div>
          
          <div className="space-y-4">
            {/* Shield */}
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded border border-slate-700">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-900/50 rounded text-blue-400"><Shield size={24} /></div>
                 <div className="text-left">
                   <div className="font-bold text-white">{t.items.shield}</div>
                   <div className="text-xs text-slate-500">{t.desc.shield}</div>
                   <div className="text-xs text-blue-300">Owned: {inventory.shields}</div>
                 </div>
               </div>
               <button 
                 onClick={() => buyItem('shield')}
                 disabled={score < ITEM_PRICES.shield}
                 className={`px-4 py-2 rounded font-bold transition flex items-center gap-1 ${score >= ITEM_PRICES.shield ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
               >
                 <Star size={12} className="fill-current" /> {ITEM_PRICES.shield}
               </button>
            </div>

            {/* Sword */}
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded border border-slate-700">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-orange-900/50 rounded text-orange-400"><Sword size={24} /></div>
                 <div className="text-left">
                   <div className="font-bold text-white">{t.items.sword}</div>
                   <div className="text-xs text-slate-500">{t.desc.sword}</div>
                   <div className="text-xs text-orange-300">Owned: {inventory.swords}</div>
                 </div>
               </div>
               <button 
                 onClick={() => buyItem('sword')}
                 disabled={score < ITEM_PRICES.sword}
                 className={`px-4 py-2 rounded font-bold transition flex items-center gap-1 ${score >= ITEM_PRICES.sword ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
               >
                 <Star size={12} className="fill-current" /> {ITEM_PRICES.sword}
               </button>
            </div>

            {/* Pistol */}
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded border border-slate-700">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-pink-900/50 rounded text-pink-400"><Crosshair size={24} /></div>
                 <div className="text-left">
                   <div className="font-bold text-white">{t.items.pistol}</div>
                   <div className="text-xs text-slate-500">{t.desc.pistol}</div>
                   <div className="text-xs text-pink-300">Owned: {inventory.pistols}</div>
                 </div>
               </div>
               <button 
                 onClick={() => buyItem('pistol')}
                 disabled={score < ITEM_PRICES.pistol}
                 className={`px-4 py-2 rounded font-bold transition flex items-center gap-1 ${score >= ITEM_PRICES.pistol ? 'bg-pink-600 hover:bg-pink-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
               >
                 <Star size={12} className="fill-current" /> {ITEM_PRICES.pistol}
               </button>
            </div>

            {/* Drill */}
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded border border-slate-700">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-yellow-900/50 rounded text-yellow-400"><Drill size={24} /></div>
                 <div className="text-left">
                   <div className="font-bold text-white">{t.items.drill}</div>
                   <div className="text-xs text-slate-500">{t.desc.drill}</div>
                   <div className="text-xs text-yellow-300">Owned: {inventory.drills}</div>
                 </div>
               </div>
               <button 
                 onClick={() => buyItem('drill')}
                 disabled={score < ITEM_PRICES.drill}
                 className={`px-4 py-2 rounded font-bold transition flex items-center gap-1 ${score >= ITEM_PRICES.drill ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
               >
                 <Star size={12} className="fill-current" /> {ITEM_PRICES.drill}
               </button>
            </div>
          </div>
        </div>

        <button 
          onClick={nextLevel}
          className="w-full max-w-lg px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xl transition shadow-lg shadow-emerald-900/50"
        >
          {t.next}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 pb-44">
      
      {/* HUD */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-cyan-400">{t.title}</h1>
            <div className="text-xs text-slate-500">{t.level} {level}</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400 flex items-center gap-1">
              <Star size={18} className="fill-yellow-400" />
              {score}
            </div>
            <div className="text-xs text-slate-500">{t.score}</div>
          </div>
        </div>
        
        {renderInventory()}

        <div className="flex gap-2">
          <button onClick={restartGame} className="p-2 text-slate-500 hover:text-white transition" title={t.restart}>
             <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Enemy Status Indicator */}
      {enemyActive && enemyPos ? (
         <div className="mb-2 flex items-center gap-1 text-red-500 bg-red-950/50 px-3 py-1 rounded border border-red-900/50 text-xs font-bold animate-pulse">
           <Skull size={14} /> {t.hunter} {enemySpeedMult > 1.0 && <span className="text-[10px] ml-1 opacity-75">(Speed x{enemySpeedMult.toFixed(1)})</span>}
         </div>
      ) : (
        <div className="mb-2 h-6"></div> // Spacer
      )}

      {/* Hint Area */}
      <div className="text-center mb-4 max-w-md">
        <span className="bg-slate-800 px-3 py-1 rounded-full text-xs text-yellow-400 font-bold uppercase tracking-wider">{t.hint}</span>
        <p className="mt-2 text-slate-300 italic">"{wordHint}"</p>
      </div>

      {renderWordProgress()}

      <MazeRender 
        maze={maze} 
        playerPos={playerPos} 
        letters={letters} 
        enemyPos={enemyActive ? enemyPos : null} 
        hasShield={inventory.shields > 0} 
      />

      {/* Mobile Controls Overlay */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex items-end justify-between px-6 pb-2 md:hidden pointer-events-none select-none">
         {/* D-PAD - Left Side */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36 pointer-events-auto bg-slate-900/50 p-2 rounded-full backdrop-blur-sm shadow-xl border border-slate-700/50">
            {/* Row 1 */}
            <div />
            <button 
              className="w-full h-full bg-slate-700/80 border border-slate-500 rounded-t-xl active:bg-cyan-600 active:scale-95 transition flex items-center justify-center shadow-lg"
              onMouseDown={(e) => { e.preventDefault(); handlePadStart('ArrowUp', 0, -1); }}
              onMouseUp={(e) => { e.preventDefault(); handlePadEnd('ArrowUp'); }}
              onMouseLeave={(e) => { e.preventDefault(); handlePadEnd('ArrowUp'); }}
              onTouchStart={(e) => { e.preventDefault(); handlePadStart('ArrowUp', 0, -1); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePadEnd('ArrowUp'); }}
              onTouchCancel={(e) => { e.preventDefault(); handlePadEnd('ArrowUp'); }}
            >
              <ArrowUp size={28} className="text-cyan-50" />
            </button>
            <div />
            
            {/* Row 2 */}
            <button 
              className="w-full h-full bg-slate-700/80 border border-slate-500 rounded-l-xl active:bg-cyan-600 active:scale-95 transition flex items-center justify-center shadow-lg"
              onMouseDown={(e) => { e.preventDefault(); handlePadStart('ArrowLeft', -1, 0); }}
              onMouseUp={(e) => { e.preventDefault(); handlePadEnd('ArrowLeft'); }}
              onMouseLeave={(e) => { e.preventDefault(); handlePadEnd('ArrowLeft'); }}
              onTouchStart={(e) => { e.preventDefault(); handlePadStart('ArrowLeft', -1, 0); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePadEnd('ArrowLeft'); }}
              onTouchCancel={(e) => { e.preventDefault(); handlePadEnd('ArrowLeft'); }}
            >
              <ArrowLeft size={28} className="text-cyan-50" />
            </button>
            
            {/* Center Decorative */}
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-slate-600/50"></div>
            </div>

            <button 
              className="w-full h-full bg-slate-700/80 border border-slate-500 rounded-r-xl active:bg-cyan-600 active:scale-95 transition flex items-center justify-center shadow-lg"
              onMouseDown={(e) => { e.preventDefault(); handlePadStart('ArrowRight', 1, 0); }}
              onMouseUp={(e) => { e.preventDefault(); handlePadEnd('ArrowRight'); }}
              onMouseLeave={(e) => { e.preventDefault(); handlePadEnd('ArrowRight'); }}
              onTouchStart={(e) => { e.preventDefault(); handlePadStart('ArrowRight', 1, 0); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePadEnd('ArrowRight'); }}
              onTouchCancel={(e) => { e.preventDefault(); handlePadEnd('ArrowRight'); }}
            >
              <ArrowRight size={28} className="text-cyan-50" />
            </button>

            {/* Row 3 */}
            <div />
            <button 
              className="w-full h-full bg-slate-700/80 border border-slate-500 rounded-b-xl active:bg-cyan-600 active:scale-95 transition flex items-center justify-center shadow-lg"
              onMouseDown={(e) => { e.preventDefault(); handlePadStart('ArrowDown', 0, 1); }}
              onMouseUp={(e) => { e.preventDefault(); handlePadEnd('ArrowDown'); }}
              onMouseLeave={(e) => { e.preventDefault(); handlePadEnd('ArrowDown'); }}
              onTouchStart={(e) => { e.preventDefault(); handlePadStart('ArrowDown', 0, 1); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePadEnd('ArrowDown'); }}
              onTouchCancel={(e) => { e.preventDefault(); handlePadEnd('ArrowDown'); }}
            >
              <ArrowDown size={28} className="text-cyan-50" />
            </button>
            <div />
        </div>
        
        {/* Shoot Button - Right Side */}
        <button 
            className={`w-24 h-24 mb-4 rounded-full flex flex-col items-center justify-center border-4 shadow-2xl transition active:scale-95 pointer-events-auto backdrop-blur-sm ${inventory.pistols > 0 ? 'bg-pink-900/90 border-pink-500 text-pink-100 shadow-pink-900/50' : 'bg-slate-800/90 border-slate-600 text-slate-400'}`}
            onMouseDown={(e) => { e.preventDefault(); firePistol(); }}
            onTouchStart={(e) => { e.preventDefault(); firePistol(); }}
        >
            <Crosshair size={36} />
            <span className="text-[10px] font-bold mt-1 tracking-widest">FIRE</span>
        </button>
      </div>
      
      <div className="hidden md:block mt-6 text-slate-600 text-sm">
        {t.controls}
      </div>
    </div>
  );
};

export default App;