import React, { useState, useEffect } from 'react';
import { CARD_DEFINITIONS, CardMeta } from '../game/cardData';
import { CardType } from '../types/game';
import { BookOpen, X, Shield, Search, Sparkles, Volume2, VolumeX } from 'lucide-react';
import {
  CARD_SPRITE_GRID,
  getStoredCardImage,
  isCardImageEnabled,
} from '../utils/cardImageSetting';

interface RulesModalProps {
  onClose: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose, soundEnabled = true, onToggleSound }) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'rules'>('cards');
  const [cardImageSrc, setCardImageSrc] = useState<string>(getStoredCardImage());
  const [useImage, setUseImage] = useState<boolean>(isCardImageEnabled());

  useEffect(() => {
    const handleUpdate = () => {
      setCardImageSrc(getStoredCardImage());
      setUseImage(isCardImageEnabled());
    };
    window.addEventListener('odoru_card_image_updated', handleUpdate);
    return () => {
      window.removeEventListener('odoru_card_image_updated', handleUpdate);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">ルールブック＆全カード図鑑</h2>
                {onToggleSound && (
                  <button
                    onClick={onToggleSound}
                    className={`px-2 py-0.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm ${
                      soundEnabled
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 hover:bg-amber-400/30'
                        : 'bg-white/5 text-stone-400 border-white/10 hover:bg-white/10'
                    }`}
                    title="サウンド切替"
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-bold">音声 ON</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                        <span className="text-[11px] font-bold">音声 OFF</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-stone-400">第三版ルール準拠・全32枚のカード効果</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'cards'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-stone-300 hover:bg-slate-700'
            }`}
          >
            🃏 全カード一覧（32枚）
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
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
              {Object.values(CARD_DEFINITIONS).map((card: CardMeta) => {
                const sprite = CARD_SPRITE_GRID[card.type] || { col: 0, row: 0 };
                const posX = (sprite.col / 3) * 100;
                const posY = (sprite.row / 2) * 100;

                return (
                  <div
                    key={card.type}
                    className="p-2.5 sm:p-3 rounded-2xl bg-slate-950 border border-white/10 hover:border-amber-500/40 transition flex gap-3 text-xs items-center shadow-md"
                  >
                    {/* Card Illustration */}
                    {useImage && cardImageSrc ? (
                      <div
                        className="w-14 sm:w-16 h-20 sm:h-22 rounded-xl overflow-hidden shadow-lg border-2 border-amber-500/40 shrink-0 relative bg-slate-900 flex flex-col justify-end p-1 transition-transform hover:scale-105"
                        style={{
                          backgroundImage: `url(${cardImageSrc})`,
                          backgroundSize: '400% 300%',
                          backgroundPosition: `${posX}% ${posY}%`,
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        <div className="self-end px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-sm text-[9px] font-black text-amber-300 border border-white/20 shadow">
                          {card.totalCount}枚
                        </div>
                      </div>
                    ) : (
                      <div className="w-14 sm:w-16 h-20 sm:h-22 rounded-xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center shrink-0 shadow-inner">
                        <span className="text-2xl">{card.icon}</span>
                        <span className="text-[10px] text-amber-300 mt-1 font-bold">{card.totalCount}枚</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-extrabold text-amber-300 text-sm">{card.name}</span>
                        <span className="text-[10px] text-stone-400 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                          {card.categoryLabel}
                        </span>
                      </div>
                      <p className="text-stone-300 leading-snug text-[11px]">{card.detail}</p>
                    </div>
                  </div>
                );
              })}
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

              {/* プレイ人数とカード構成表 */}
              <div>
                <h3 className="font-black text-amber-400 text-sm mb-1 flex items-center gap-1.5">
                  <span>👥</span>
                  <span>プレイ人数と使用カード枚数（3〜8人）</span>
                </h3>
                <p className="text-[11px] text-stone-300 mb-2">
                  人数に応じてデッキ総数（1人4枚 × 人数）と必須カードの枚数が決まります。
                  <span className="text-amber-300 font-bold ml-1">
                    （3〜5人は探偵2枚以上確定、6〜8人は探偵3枚以上確定！）
                  </span>
                </p>

                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 mb-2.5">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-900 border-b border-white/10 text-stone-300">
                        <th className="py-1.5 px-2.5 font-black text-amber-300">人数</th>
                        <th className="py-1.5 px-2 font-black text-white">デッキ総数</th>
                        <th className="py-1.5 px-2 font-black text-amber-200">必ず入る必須カード</th>
                        <th className="py-1.5 px-2 font-black text-stone-400">ランダム追加</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      <tr className="hover:bg-white/5">
                        <td className="py-1.5 px-2.5 font-bold text-amber-400">3人</td>
                        <td className="py-1.5 px-2 font-mono font-bold text-white">12枚</td>
                        <td className="py-1.5 px-2 text-stone-200 leading-tight">
                          第一発見者 1, 犯人 1, <span className="text-cyan-300 font-bold">探偵 2</span>, アリバイ 1
                        </td>
                        <td className="py-1.5 px-2 text-stone-400">他から7枚</td>
                      </tr>
                      <tr className="hover:bg-white/5">
                        <td className="py-1.5 px-2.5 font-bold text-amber-400">4人</td>
                        <td className="py-1.5 px-2 font-mono font-bold text-white">16枚</td>
                        <td className="py-1.5 px-2 text-stone-200 leading-tight">
                          第一発見者 1, 犯人 1, <span className="text-cyan-300 font-bold">探偵 2</span>, アリバイ 1, たくらみ 1
                        </td>
                        <td className="py-1.5 px-2 text-stone-400">他から10枚</td>
                      </tr>
                      <tr className="hover:bg-white/5">
                        <td className="py-1.5 px-2.5 font-bold text-amber-400">5人</td>
                        <td className="py-1.5 px-2 font-mono font-bold text-white">20枚</td>
                        <td className="py-1.5 px-2 text-stone-200 leading-tight">
                          第一発見者 1, 犯人 1, <span className="text-cyan-300 font-bold">探偵 2</span>, アリバイ 2, たくらみ 1
                        </td>
                        <td className="py-1.5 px-2 text-stone-400">他から13枚</td>
                      </tr>
                      <tr className="hover:bg-white/5">
                        <td className="py-1.5 px-2.5 font-bold text-amber-400">6人</td>
                        <td className="py-1.5 px-2 font-mono font-bold text-white">24枚</td>
                        <td className="py-1.5 px-2 text-stone-200 leading-tight">
                          第一発見者 1, 犯人 1, <span className="text-cyan-300 font-bold">探偵 3</span>, アリバイ 2, たくらみ 2
                        </td>
                        <td className="py-1.5 px-2 text-stone-400">他から15枚</td>
                      </tr>
                      <tr className="hover:bg-white/5">
                        <td className="py-1.5 px-2.5 font-bold text-amber-400">7人</td>
                        <td className="py-1.5 px-2 font-mono font-bold text-white">28枚</td>
                        <td className="py-1.5 px-2 text-stone-200 leading-tight">
                          第一発見者 1, 犯人 1, <span className="text-cyan-300 font-bold">探偵 3</span>, アリバイ 3, たくらみ 2
                        </td>
                        <td className="py-1.5 px-2 text-stone-400">他から18枚</td>
                      </tr>
                      <tr className="hover:bg-white/5 bg-amber-500/10">
                        <td className="py-1.5 px-2.5 font-black text-amber-300">8人</td>
                        <td className="py-1.5 px-2 font-mono font-black text-amber-300">32枚</td>
                        <td className="py-1.5 px-2 text-amber-200 font-bold leading-tight" colSpan={2}>
                          全32枚のカードをすべて使用（探偵4枚確定・フルデッキ）
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-[10.5px] text-stone-300 space-y-1">
                  <div className="font-bold text-amber-300">🃏 カード全32枚の内訳:</div>
                  <div className="leading-relaxed">
                    第一発見者 1枚 / 犯人 1枚 / 探偵 4枚 / アリバイ 5枚 / たくらみ 2枚 / 取り引き 5枚 / うわさ 4枚 / 情報操作 3枚 / 目撃者 3枚 / 一般人 2枚 / いぬ 1枚 / 少年 1枚
                  </div>
                  <div className="text-stone-400 text-[10px]">
                    ※ 3〜7人の時は、必須カードを取り分けた後、残りのプールからランダムに指定枚数が選ばれてデッキが作られます。
                  </div>
                </div>
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
