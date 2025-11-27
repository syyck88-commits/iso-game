
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './classes/GameEngine';
import { EntityType } from './types';
import { Tower } from './classes/Entities';

// Subcomponents
import { LoadingScreen } from './components/LoadingScreen';
import { TopBar } from './components/TopBar';
import { BuildMenu } from './components/BuildMenu';
import { TowerPanel } from './components/TowerPanel';
import { GameOver } from './components/GameOver';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const lastTimeRef = useRef<number>(0);
  
  // Loading State
  const [loadingState, setLoadingState] = useState<'INIT' | 'LOADING' | 'READY' | 'ERROR'>('INIT');
  const [initComplete, setInitComplete] = useState(false); 
  const [progress, setProgress] = useState(0);
  const [statusLog, setStatusLog] = useState<string[]>(['System Booting...']);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Game State
  const [money, setMoney] = useState(120);
  const [health, setHealth] = useState(20);
  const [wave, setWave] = useState(1);
  const [selectedTool, setSelectedTool] = useState<EntityType | null>(null);
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [nextWaveType, setNextWaveType] = useState<string>('NORMAL');

  const addLog = (msg: string) => {
      setStatusLog(prev => {
          const newLogs = [...prev, msg];
          return newLogs.slice(-30); 
      });
  };

  const startLoop = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const loop = (timestamp: number) => {
        if (!engineRef.current) return;
        
        // Initialize lastTime on first frame
        if (lastTimeRef.current === 0) {
            lastTimeRef.current = timestamp;
        }

        // Calculate delta time in ms
        const deltaTime = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Cap deltaTime to prevent huge jumps (max ~15fps)
        const safeDt = Math.min(deltaTime, 65);

        const eng = engineRef.current;
        
        eng.update(safeDt);
        eng.draw();
        
        setMoney(eng.gameState.money);
        setHealth(eng.gameState.health);
        setWave(eng.gameState.wave);
        setNextWaveType(eng.nextWaveType);
        setIsGameOver(!eng.gameState.gameActive);
        
        if (eng.input.selectedEntityId) {
            const t = eng.entities.find(e => e.id === eng.input.selectedEntityId);
            if (t && t.type.startsWith('TOWER')) {
                // @ts-ignore
                setSelectedTower(t); 
            } else {
                setSelectedTower(null);
            }
        } else {
            setSelectedTower(prev => prev ? null : prev);
        }
  
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      
      // Reset timer and start
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!canvasRef.current) {
        addLog("Error: Canvas DOM element missing.");
        return;
    }

    const engine = new GameEngine(canvasRef.current, {
        onBuild: () => {
            // Build happened, we might want to clear tool or keep it. 
            // Usually keep it for rapid building, but let's clear if shift not held (not implemented yet)
        },
        onSelect: (entityId) => {
             if (!entityId) setSelectedTower(null);
        }
    });

    engineRef.current = engine;
    addLog('Video Engine Initialized.');
    
    const initGame = async () => {
        setLoadingState('LOADING');
        addLog('Initializing Audio Subsystem...');
        
        try {
            await engine.audio.initialize(
                (pct) => {
                    if(isMountedRef.current) setProgress(pct);
                },
                (msg) => {
                    if(isMountedRef.current) addLog(msg);
                }
            );
            
            if(isMountedRef.current) {
                addLog("Initialization Complete.");
                addLog("Ready to launch.");
                setInitComplete(true);
            }
        } catch (e) {
            console.error("Audio Load Failed:", e);
            if(isMountedRef.current) {
                setErrorMsg(e instanceof Error ? e.message : "Unknown Audio Error");
                addLog("ERROR: " + (e instanceof Error ? e.message : "Unknown"));
                setLoadingState('ERROR');
            }
        }
    };

    setTimeout(initGame, 100);

    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', engine.renderer.resize);
    };
  }, []);

  // Handlers
  const handleStartGame = () => {
      setLoadingState('READY');
      if (engineRef.current) startLoop();
  };

  const handleForceStart = () => {
      addLog("User requested SKIP.");
      handleStartGame();
  };

  const handleToolSelect = (tool: EntityType | null) => {
    // If tool is already selected, deselect it
    const newTool = tool === selectedTool ? null : tool;
    
    setSelectedTool(newTool);
    if (engineRef.current) {
      engineRef.current.setSelectedTower(newTool);
      // If we select a tool, we deselect any tower
      if (newTool) {
          engineRef.current.input.selectedEntityId = null;
          setSelectedTower(null);
      }
    }
  };

  const handleNextWave = () => {
    if (engineRef.current && engineRef.current.gameState.gameActive) engineRef.current.startWave();
  };

  const handleUpgrade = () => {
      if (engineRef.current) engineRef.current.upgradeSelectedTower();
  };

  const handleSell = () => {
      if (engineRef.current) engineRef.current.sellSelectedTower();
  }

  const handleRestart = () => {
      if (engineRef.current) {
          engineRef.current.restartGame();
          setIsGameOver(false);
          setSelectedTool(null);
          setTimeScale(1);
          setIsPaused(false);
          setDebugMode(false);
      }
  };

  const handleTimeScale = () => {
      if (!engineRef.current) return;
      const newScale = timeScale === 1 ? 2 : 1;
      setTimeScale(newScale);
      engineRef.current.setTimeScale(newScale);
  };

  const handlePause = () => {
      if (!engineRef.current) return;
      const nextState = !isPaused;
      setIsPaused(nextState);
      engineRef.current.paused = nextState;
  };

  const handleDebugToggle = () => {
      if (!engineRef.current) return;
      engineRef.current.toggleDebug();
      setDebugMode(engineRef.current.debugMode);
  }

  // KEYBOARD SHORTCUTS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (loadingState !== 'READY') return;

        // Prevent defaults for game keys
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
             // Optional: e.preventDefault(); 
        }

        switch (e.code) {
            case 'Digit1': handleToolSelect(EntityType.TOWER_BASIC); break;
            case 'Digit2': handleToolSelect(EntityType.TOWER_PULSE); break;
            case 'Digit3': handleToolSelect(EntityType.TOWER_SNIPER); break;
            case 'Digit4': handleToolSelect(EntityType.TOWER_LASER); break;
            
            case 'Space': 
                e.preventDefault();
                handleNextWave(); 
                break;
            
            case 'KeyF': handleTimeScale(); break;
            
            case 'Escape': 
            case 'KeyP':
                if (selectedTool) {
                    handleToolSelect(null);
                } else if (selectedTower) {
                    if (engineRef.current) {
                        engineRef.current.input.deselectAll();
                        setSelectedTower(null);
                    }
                } else {
                    handlePause();
                }
                break;
            
            case 'KeyU':
                if (selectedTower) handleUpgrade();
                break;

            case 'Backspace':
            case 'Delete':
                if (selectedTower) handleSell();
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadingState, selectedTool, selectedTower, timeScale, isPaused]); // Deps for closure state

  return (
    <div className="relative w-full h-full bg-slate-900 select-none font-sans overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      
      <canvas ref={canvasRef} className="block w-full h-full focus:outline-none cursor-crosshair" />

      {/* Loading Screen */}
      <LoadingScreen 
         loadingState={loadingState}
         progress={progress}
         statusLog={statusLog}
         errorMsg={errorMsg}
         initComplete={initComplete}
         onStart={handleStartGame}
         onForceStart={handleForceStart}
      />

      {loadingState === 'READY' && (
      <>
        <TopBar 
            money={money}
            health={health}
            wave={wave}
            nextWaveType={nextWaveType}
            debugMode={debugMode}
            isPaused={isPaused}
            timeScale={timeScale}
            onRestart={handleRestart}
            onPause={handlePause}
            onTimeScale={handleTimeScale}
            onDebugToggle={handleDebugToggle}
        />

        {selectedTower && (
            <TowerPanel 
                tower={selectedTower}
                money={money}
                debugMode={debugMode}
                onUpgrade={handleUpgrade}
                onSell={handleSell}
            />
        )}

        <BuildMenu 
            selectedTool={selectedTool}
            money={money}
            debugMode={debugMode}
            onSelectTool={(t) => handleToolSelect(selectedTool === t ? null : t)}
            onNextWave={handleNextWave}
        />

        {isPaused && !isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="bg-black/50 px-6 py-2 rounded-full text-white font-bold text-xl backdrop-blur-sm border border-white/10">
                    PAUSED
                </div>
            </div>
        )}

        {isGameOver && (
            <GameOver wave={wave} onRestart={handleRestart} />
        )}
      </>
      )}
    </div>
  );
};

export default App;
