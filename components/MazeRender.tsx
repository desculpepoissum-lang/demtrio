import React from 'react';
import { MazeGrid, Position, LetterItem } from '../types';
import { User, Skull } from 'lucide-react';

interface MazeRenderProps {
  maze: MazeGrid;
  playerPos: Position;
  letters: LetterItem[];
  enemyPos: Position | null;
  hasShield: boolean;
}

const MazeRender: React.FC<MazeRenderProps> = ({ maze, playerPos, letters, enemyPos, hasShield }) => {
  const height = maze.length;
  const width = maze[0].length;

  // Calculate cell size based on viewport to fit the maze
  const cellSizeClass = width > 20 ? 'w-5 h-5' : 'w-7 h-7 sm:w-8 sm:h-8';

  return (
    <div className="relative p-1 bg-slate-800 rounded-lg shadow-2xl overflow-hidden border-4 border-slate-700">
      {/* Grid Container */}
      <div 
        className="relative bg-slate-900"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${width}, min-content)`,
        }}
      >
        {maze.map((row, y) =>
          row.map((cell, x) => {
            const letterAtCell = letters.find(l => l.position.x === x && l.position.y === y && !l.collected);
            
            let cellBg = 'bg-slate-900'; // Path
            if (cell === 'wall') cellBg = 'bg-slate-800 border-[0.5px] border-slate-700/30'; 
            
            return (
              <div
                key={`${x}-${y}`}
                className={`${cellSizeClass} ${cellBg} flex items-center justify-center relative`}
              >
                {/* Floor detail */}
                {cell === 'path' && !letterAtCell && (
                  <div className="w-1 h-1 bg-slate-800 rounded-full opacity-20"></div>
                )}

                {/* Letter Item (Static in grid) */}
                {letterAtCell && (
                  <div className="animate-bounce text-yellow-400 font-bold text-xs sm:text-sm drop-shadow-lg z-10">
                    {letterAtCell.char}
                  </div>
                )}
              </div>
            );
          })
        )}
      
        {/* Enemy Overlay - Smooth Transition */}
        {enemyPos && (
          <div 
            className={`absolute top-0 left-0 ${cellSizeClass} flex items-center justify-center z-30 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-transform duration-[600ms] ease-linear opacity-85 pointer-events-none`}
            style={{ transform: `translate(${enemyPos.x * 100}%, ${enemyPos.y * 100}%)` }}
          >
            <Skull size="80%" fill="currentColor" className="animate-pulse" />
          </div>
        )}

        {/* Player Overlay - Smooth Transition */}
        <div 
          className={`absolute top-0 left-0 ${cellSizeClass} flex items-center justify-center z-40 text-cyan-400 transition-transform duration-100 ease-linear`}
          style={{ transform: `translate(${playerPos.x * 100}%, ${playerPos.y * 100}%)` }}
        >
          {/* Shield Aura */}
          {hasShield && (
            <div className="absolute w-[140%] h-[140%] border-2 border-blue-500/50 bg-blue-500/20 rounded-full animate-pulse z-30"></div>
          )}
          <User size="80%" fill="currentColor" className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] z-40 relative" />
        </div>

      </div>
    </div>
  );
};

export default MazeRender;