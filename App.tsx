
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GameState, MovieInfo, UserStats } from './types';
import { getRandomMovie, generateMonsterScene } from './geminiService';
import { Trophy, Star, Delete, FastForward } from 'lucide-react';
import confetti from 'canvas-confetti';
import localforage from 'localforage';

const ALPHANUMERIC = /^[a-z0-9æøå]$/i;
const isAlphaNumeric = (char: string) => ALPHANUMERIC.test(char);

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [stats, setStats] = useState<UserStats>({ oscars: 0, streak: 0 });
  const [currentMovie, setCurrentMovie] = useState<MovieInfo | null>(null);
  const [usedTitles, setUsedTitles] = useState<string[]>([]);
  const [movieImage, setMovieImage] = useState<string | null>(null);
  const [guess, setGuess] = useState('');
  const [hintLevel, setHintLevel] = useState(0); 
  const [loadingStep, setLoadingStep] = useState('');

  useEffect(() => {
    localforage.getItem<UserStats>('fuzzy_stats_v3').then(s => s && setStats(s));
  }, []);

  useEffect(() => {
    localforage.setItem('fuzzy_stats_v3', stats);
  }, [stats]);

  const movieLetters = useMemo(() => currentMovie?.title.split('') || [], [currentMovie]);
  const alphaIndices = useMemo(() => movieLetters.map((c, i) => isAlphaNumeric(c) ? i : -1).filter(i => i !== -1), [movieLetters]);

  const startNewRound = useCallback(async () => {
    setGameState(GameState.LOADING);
    setGuess('');
    setHintLevel(0);
    setLoadingStep('Finder en god film...');
    try {
      const movie = await getRandomMovie(usedTitles);
      setCurrentMovie(movie);
      setUsedTitles(prev => [...prev, movie.title]);
      setLoadingStep('Gør scenen pelset...');
      const image = await generateMonsterScene(movie);
      setMovieImage(image);
      setGameState(GameState.PLAYING);
    } catch (e) {
      console.error(e);
      setLoadingStep('Fejl! Prøver igen...');
      setTimeout(startNewRound, 2000);
    }
  }, [usedTitles]);

  const onKeyPress = (key: string) => {
    if (gameState !== GameState.PLAYING) return;
    if (key === 'SLET') setGuess(prev => prev.slice(0, -1));
    else if (guess.length < alphaIndices.length) setGuess(prev => prev + key);
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING && currentMovie && guess.length === alphaIndices.length) {
      let gPtr = 0;
      const finalGuess = movieLetters.map(c => isAlphaNumeric(c) ? guess[gPtr++] : c).join('').toUpperCase();
      if (finalGuess === currentMovie.title.toUpperCase()) {
        confetti({ 
          particleCount: 150, 
          spread: 70, 
          origin: { y: 0.6 },
          colors: ['#ec4899', '#06b6d4', '#eab308']
        });
        const nextStreak = stats.streak + 1;
        setStats(prev => ({ 
          streak: nextStreak, 
          oscars: nextStreak > 0 && nextStreak % 5 === 0 ? prev.oscars + 1 : prev.oscars 
        }));
        setGameState(GameState.CORRECT);
      }
    }
  }, [guess, currentMovie, gameState, movieLetters, stats.streak]);

  const useHint = () => {
    if (stats.oscars > 0 && hintLevel < 3) {
      setStats(prev => ({ ...prev, oscars: prev.oscars - 1 }));
      setHintLevel(prev => prev + 1);
    }
  };

  const keyboardRows = [
    ['Q','W','E','R','T','Y','U','I','O','P','Å'],
    ['A','S','D','F','G','H','J','K','L','Æ','Ø'],
    ['Z','X','C','V','B','N','M', 'SLET']
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto w-full px-4 py-4">
      <header className="flex justify-between items-center mb-6 bg-slate-900/60 p-4 rounded-3xl border border-white/10 shadow-lg">
        <h1 className="text-xl font-80s-3d-small">PELSET QUIZ</h1>
        <div className="flex gap-3 font-bold">
          <div className="bg-pink-500/20 px-3 py-1 rounded-full text-pink-500 flex items-center gap-1 border border-pink-500/30">
            <Star size={16} fill="currentColor"/> {stats.streak}
          </div>
          <div className="bg-yellow-500/20 px-3 py-1 rounded-full text-yellow-500 flex items-center gap-1 border border-yellow-500/30">
            <Trophy size={16} fill="currentColor"/> {stats.oscars}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center">
        {gameState === GameState.START && (
          <div className="text-center space-y-12 py-10">
            <h2 className="text-6xl sm:text-7xl font-80s-3d">MONSTER<br/>MOVIES</h2>
            <button onClick={startNewRound} className="px-12 py-6 bg-pink-600 rounded-3xl font-80s-3d-small text-2xl shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:bg-pink-500 transition-all active:scale-95">SPIL</button>
          </div>
        )}

        {gameState === GameState.LOADING && (
          <div className="text-center space-y-6">
            <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-cyan-400 font-bold text-lg animate-pulse">{loadingStep}</p>
          </div>
        )}

        {gameState === GameState.PLAYING && (
          <div className="space-y-6">
            <div className="rounded-[2.5rem] overflow-hidden border-4 border-slate-800 aspect-video shadow-2xl bg-slate-900">
              {movieImage && <img src={movieImage} className="w-full h-full object-cover" alt="Quiz scene" />}
            </div>

            <div className="flex flex-wrap gap-2 justify-center py-4">
              {currentMovie?.title.split(' ').map((word, wIdx) => (
                <div key={wIdx} className="flex gap-1">
                  {word.split('').map((char, cIdx) => {
                    const absIdx = currentMovie.title.split(' ').slice(0, wIdx).join(' ').length + (wIdx > 0 ? 1 : 0) + cIdx;
                    if (!isAlphaNumeric(char)) return <div key={cIdx} className="w-4 flex items-center justify-center text-xl font-black text-pink-500">{char}</div>;
                    const letterIdx = alphaIndices.indexOf(absIdx);
                    return <div key={cIdx} className={`letter-slot ${guess[letterIdx] ? 'filled' : 'empty'}`}>{guess[letterIdx] || ''}</div>;
                  })}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {hintLevel >= 1 && <div className="p-3 bg-slate-800/80 rounded-2xl border border-white/5 text-sm"><span className="text-cyan-400 font-bold">ÅR:</span> {currentMovie?.year}</div>}
              {hintLevel >= 2 && <div className="p-3 bg-slate-800/80 rounded-2xl border border-white/5 text-sm"><span className="text-cyan-400 font-bold">INSTRUKTØR:</span> {currentMovie?.director}</div>}
              {hintLevel >= 3 && <div className="p-3 bg-slate-800/80 rounded-2xl border border-white/5 text-sm"><span className="text-cyan-400 font-bold">SKUESPILLER:</span> {currentMovie?.actor}</div>}
              
              <button 
                onClick={useHint} 
                disabled={stats.oscars === 0 || hintLevel >= 3} 
                className="w-full py-4 bg-yellow-500 text-slate-900 font-black rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-20"
              >
                {hintLevel < 3 ? `FÅ HINT (1 OSCAR - ${stats.oscars} tilbage)` : 'INGEN FLERE HINTS'}
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              {keyboardRows.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-1">
                  {row.map(k => (
                    <button 
                      key={k} 
                      onClick={() => onKeyPress(k)} 
                      className={`${k === 'SLET' ? 'px-4 bg-pink-600' : 'flex-1 bg-slate-700'} h-12 rounded-xl font-bold text-sm active:bg-cyan-500 transition-colors shadow-md`}
                    >
                      {k === 'SLET' ? <Delete size={18} className="mx-auto" /> : k}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {gameState === GameState.CORRECT && (
          <div className="text-center space-y-8 animate-in zoom-in-95">
            <h2 className="text-6xl font-80s-3d text-cyan-400">FLOT!</h2>
            <p className="text-2xl font-black uppercase tracking-widest">{currentMovie?.title}</p>
            <button 
              onClick={startNewRound} 
              className="w-full py-6 bg-white text-slate-900 font-black rounded-3xl text-xl flex items-center justify-center gap-3 shadow-2xl active:scale-95"
            >
              NÆSTE FILM <FastForward/>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
