/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Play, 
  Volume2, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  User,
  Timer,
  BarChart3,
  Gamepad2,
  ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn, playWord, formatDuration } from './utils';
import { GameState, Word, GameRecord } from './types';
import { generateLevelWords, generateDistractors } from './services/geminiService';
import { sheetsService } from './services/sheetsService';

// Mock data generator for immediate playability
const MOCK_WORDS: Record<number, {word: string, translation: string}[]> = {
  1: [
    { word: "abandon", translation: "放弃" },
    { word: "ability", translation: "能力" },
    { word: "abroad", translation: "在国外" },
    { word: "absolute", translation: "绝对的" },
    { word: "academic", translation: "学术的" },
    { word: "accent", translation: "口音" },
    { word: "accept", translation: "接受" },
    { word: "access", translation: "接近；进入" },
    { word: "accident", translation: "事故" },
    { word: "account", translation: "账户；解释" },
  ]
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [playerId, setPlayerId] = useState('');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{wordId: number, selected: string, isCorrect: boolean}[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState(1);

  // Initialize game
  const startLevel = async (level: number) => {
    setIsLoading(true);
    try {
      // 1. Fetch words (from Sheets or Gemini)
      let rawWords = await sheetsService.fetchLevelWords(level);
      if (rawWords.length === 0) {
        // Fallback to Gemini generation or mock
        rawWords = MOCK_WORDS[level] || await generateLevelWords(level);
      }

      // 2. Prepare words with distractors
      const preparedWords: Word[] = await Promise.all(
        rawWords.slice(0, 50).map(async (w: any, idx: number) => {
          const distractors = await generateDistractors(w.word, w.translation);
          const options = [...distractors, w.translation].sort(() => Math.random() - 0.5);
          return {
            id: idx,
            word: w.word,
            translation: w.translation,
            options,
            correctAnswer: w.translation
          };
        })
      );

      setWords(preparedWords);
      setCurrentIndex(0);
      setUserAnswers([]);
      setStartTime(Date.now());
      setGameState('PLAYING');
    } catch (error) {
      console.error("Failed to start level:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (selected: string) => {
    const currentWord = words[currentIndex];
    const isCorrect = selected === currentWord.correctAnswer;
    
    setUserAnswers(prev => [...prev, {
      wordId: currentWord.id,
      selected,
      isCorrect
    }]);

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishLevel();
    }
  };

  const finishLevel = async () => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const accuracy = (correctCount / words.length) * 100;
    const passed = accuracy >= 90;

    if (passed) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF69B4', '#00BFFF']
      });
      if (currentLevel === unlockedLevel && unlockedLevel < 10) {
        setUnlockedLevel(prev => prev + 1);
      }
    }

    const record: GameRecord = {
      playerNo: Date.now().toString(),
      playerId,
      startTime: new Date(startTime).toLocaleString(),
      endTime: new Date(endTime).toLocaleString(),
      duration: formatDuration(duration),
      maxLevel: currentLevel,
      totalWords: words.length,
      correctCount,
      accuracy: `${accuracy.toFixed(2)}%`
    };

    await sheetsService.saveRecord(record);
    setGameState('RESULT');
  };

  const renderLobby = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-yellow-400 p-8"
    >
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-yellow-100 rounded-full mb-4">
          <Gamepad2 className="w-12 h-12 text-yellow-600" />
        </div>
        <h1 className="text-4xl font-black text-yellow-600 mb-2 tracking-tighter">雅思单词大闯关</h1>
        <p className="text-gray-500 font-medium italic">Eggy Style Challenge!</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">输入你的游戏ID</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="蛋仔名称..."
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-4 border-gray-200 rounded-2xl focus:border-yellow-400 focus:outline-none font-bold text-lg transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => {
            const level = i + 1;
            const isUnlocked = level <= unlockedLevel;
            return (
              <button
                key={level}
                disabled={!isUnlocked || !playerId}
                onClick={() => {
                  setCurrentLevel(level);
                  startLevel(level);
                }}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center font-black text-xl transition-all border-b-4",
                  isUnlocked 
                    ? "bg-yellow-400 text-white border-yellow-600 hover:scale-105 active:translate-y-1" 
                    : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                )}
              >
                {level}
              </button>
            );
          })}
        </div>

        <button
          disabled={!playerId}
          onClick={() => startLevel(unlockedLevel)}
          className="w-full py-5 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-black text-2xl shadow-lg border-b-8 border-pink-700 transition-all active:translate-y-1 active:border-b-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <Play className="w-8 h-8 fill-current" />
          开始闯关
        </button>
      </div>
    </motion.div>
  );

  const renderGame = () => {
    const currentWord = words[currentIndex];
    if (!currentWord) return null;

    return (
      <div className="max-w-2xl w-full mx-auto">
        <div className="flex justify-between items-center mb-6 px-4">
          <div className="bg-white px-6 py-2 rounded-full shadow-md border-4 border-yellow-400 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-black text-yellow-600">LEVEL {currentLevel}</span>
          </div>
          <div className="flex-1 mx-8 bg-gray-200 h-4 rounded-full overflow-hidden border-2 border-white shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(currentIndex / words.length) * 100}%` }}
              className="h-full bg-gradient-to-r from-yellow-400 to-pink-500"
            />
          </div>
          <div className="bg-white px-6 py-2 rounded-full shadow-md border-4 border-pink-400 font-black text-pink-600">
            {currentIndex + 1} / {words.length}
          </div>
        </div>

        <motion.div 
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[3rem] shadow-2xl p-12 border-8 border-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Gamepad2 className="w-32 h-32" />
          </div>

          <div className="text-center mb-12 relative z-20">
            <h2 className="text-6xl font-black text-gray-800 mb-6 tracking-tight">{currentWord.word}</h2>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playWord(currentWord.word);
              }}
              className="p-4 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-all active:scale-95 group cursor-pointer"
              title="播放发音"
            >
              <Volume2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentWord.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(option)}
                className="group relative p-6 bg-gray-50 hover:bg-yellow-50 border-4 border-gray-100 hover:border-yellow-400 rounded-3xl text-xl font-bold text-gray-700 transition-all text-left flex items-center gap-4"
              >
                <span className="w-10 h-10 flex items-center justify-center bg-gray-200 group-hover:bg-yellow-400 group-hover:text-white rounded-xl text-sm font-black transition-colors">
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  };

  const renderResult = () => {
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const accuracy = (correctCount / words.length) * 100;
    const passed = accuracy >= 90;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full mx-auto"
      >
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-white">
          <div className={cn(
            "p-12 text-center text-white",
            passed ? "bg-green-500" : "bg-red-500"
          )}>
            <div className="inline-block p-6 bg-white/20 rounded-full mb-6">
              {passed ? <CheckCircle2 className="w-20 h-20" /> : <XCircle className="w-20 h-20" />}
            </div>
            <h2 className="text-5xl font-black mb-2">{passed ? "太棒了！通关成功" : "哎呀，差一点点"}</h2>
            <p className="text-xl opacity-90 font-bold">正确率：{accuracy.toFixed(1)}% (目标 90%)</p>
          </div>

          <div className="p-8 bg-gray-50">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-6 rounded-3xl shadow-sm border-4 border-gray-100 text-center">
                <Timer className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <div className="text-sm font-bold text-gray-400 uppercase">用时</div>
                <div className="text-2xl font-black text-gray-800">{formatDuration(Date.now() - startTime)}</div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border-4 border-gray-100 text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <div className="text-sm font-bold text-gray-400 uppercase">正确数</div>
                <div className="text-2xl font-black text-gray-800">{correctCount} / {words.length}</div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border-4 border-gray-100 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-sm font-bold text-gray-400 uppercase">当前关卡</div>
                <div className="text-2xl font-black text-gray-800">{currentLevel}</div>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto rounded-3xl border-4 border-gray-100 bg-white p-4">
              <table className="w-full">
                <thead className="sticky top-0 bg-white border-b-2 border-gray-100">
                  <tr className="text-left text-gray-400 text-xs font-black uppercase tracking-widest">
                    <th className="p-4">单词</th>
                    <th className="p-4">你的选择</th>
                    <th className="p-4">正确答案</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {userAnswers.map((ans, i) => {
                    const word = words.find(w => w.id === ans.wordId);
                    return (
                      <tr key={i} className={cn(
                        "transition-colors",
                        ans.isCorrect ? "bg-green-50" : "bg-red-50"
                      )}>
                        <td className="p-4 font-black text-gray-800">
                          <div className="flex items-center gap-2">
                            {word?.word}
                            <button onClick={() => playWord(word?.word || "")} className="text-blue-400 hover:text-blue-600">
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className={cn("p-4 font-bold", ans.isCorrect ? "text-green-600" : "text-red-600")}>
                          {ans.selected}
                        </td>
                        <td className="p-4 font-bold text-gray-500">
                          {word?.translation}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setGameState('LOBBY')}
                className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-6 h-6" />
                返回大厅
              </button>
              <button
                onClick={() => startLevel(currentLevel)}
                className="flex-1 py-4 bg-yellow-400 hover:bg-yellow-500 text-white rounded-2xl font-black text-xl shadow-lg border-b-4 border-yellow-600 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-6 h-6" />
                再试一次
              </button>
              {passed && currentLevel < 10 && (
                <button
                  onClick={() => {
                    setCurrentLevel(prev => prev + 1);
                    startLevel(currentLevel + 1);
                  }}
                  className="flex-1 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-black text-xl shadow-lg border-b-4 border-pink-700 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2"
                >
                  下一关
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-4 md:p-8 font-sans selection:bg-yellow-200">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-300 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-300 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-blue-300 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        {isLoading ? (
          <div className="text-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-20 h-20 border-8 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-2xl font-black text-yellow-600 animate-pulse">正在加载关卡...</p>
          </div>
        ) : (
          <>
            {gameState === 'LOBBY' && renderLobby()}
            {gameState === 'PLAYING' && renderGame()}
            {gameState === 'RESULT' && renderResult()}
          </>
        )}
      </main>
    </div>
  );
}
