import React, { useState } from 'react';
import { CARD_DEFINITIONS, CardMeta } from '../game/cardData';
import { CardType } from '../types/game';
import { BookOpen, X, Shield, Search, Sparkles } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'rules'>('cards');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">ルールブック＆全カード図鑑</h2>
              <p className="text-[11px] text-stone-400">第三版ルール準拠・全32枚のカード効果</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'cards'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-stone-300 hover:bg-slate-700'
            }`}
          >
            🃏 全カード一覧（32枚）
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'rules'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-stone-300 hover:bg-slate-700'
            }`}
          >
            📜 基本ルール＆勝利条件
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
          {activeTab === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(CARD_DEFINITIONS).map((card: CardMeta) => (
                <div
                  key={card.type}
                  className="p-3 rounded-2xl bg-slate-950 border border-white/5 hover:border-amber-500/30 transition flex gap-3 text-xs"
                >
                  <div className="w-12 h-16 rounded-xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center shrink-0 shadow-inner">
                    <span className="text-xl">{card.icon}</span>
                    <span className="text-[9px] text-stone-400 mt-0.5">{card.totalCount}枚</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-300 text-sm">{card.name}</span>
                      <span className="text-[10px] text-stone-500 font-mono">{card.kana}</span>
                    </div>
                    <p className="text-stone-300 mt-1 leading-snug text-[11px]">{card.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 text-xs text-stone-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-white/5">
              <div>
                <h3 className="font-black text-amber-400 text-sm mb-1">🎯 ゲームの概要</h3>
                <p>
                  各プレイヤーに4枚ずつ手札を配り、手札から1枚ずつカードを出していきます。
                  誰が「犯人」を持っているかを暴くか、あるいは犯人となって逃げ切る心理戦ゲームです。
                </p>
              </div>

              <div>
                <h3 className="font-black text-amber-400 text-sm mb-1">🏆 3つの勝利条件</h3>
                <ul className="list-disc list-inside space-y-1 text-stone-200">
                  <li>
                    <strong className="text-sky-300">探偵の勝利:</strong> 第2巡目以降に「探偵」を出し、「犯人」を持っていて「アリバイ」を持たない人を指名した場合、即座に探偵の勝利！
                  </li>
                  <li>
                    <strong className="text-amber-300">いぬの勝利:</strong> 「いぬ」を出し、相手の手札から選んだ1枚が「犯人」だった場合、即座にいぬの勝利！（アリバイは無効）
                  </li>
                  <li>
                    <strong className="text-red-300">犯人側の勝利:</strong> 手札が残り1枚の状態で「犯人」を出すことに成功した場合、犯人と「たくらみ」を出していた共犯者の勝利！
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-black text-amber-400 text-sm mb-1">⚖️ 超重要ルール</h3>
                <ul className="list-disc list-inside space-y-1 text-stone-200">
                  <li>
                    <strong>犯人は最後に出す:</strong> 手札が2枚以上あるときは犯人カードを出せません。
                  </li>
                  <li>
                    <strong>アリバイの効力:</strong> 手札に持っている時だけ探偵の告発から身を守ります。場に捨てた時点で保護は消滅します。
                  </li>
                  <li>
                    <strong>少年の直感:</strong> 少年カードを出した人のみに、現在犯人カードを持っているプレイヤー名が秘密裏に通知されます。
                  </li>
                  <li>
                    <strong>取り引き・うわさ・情報操作:</strong> 手札の犯人カードは他人の手へと次々に踊り動きます！
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
