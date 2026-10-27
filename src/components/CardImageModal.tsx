import React, { useState, useRef, useEffect } from 'react';
import {
  DEFAULT_CARD_IMAGE,
  DEFAULT_CARD_BACK_IMAGE,
  DEFAULT_APP_ICON,
  getStoredCardImage,
  getStoredCardBackImage,
  getStoredAppIcon,
  isCardImageEnabled,
  setStoredCardImage,
  setStoredCardBackImage,
  setStoredAppIcon,
  setCardImageEnabled,
  resetCardImageToDefault,
  resetCardBackImageToDefault,
  resetAppIconToDefault,
} from '../utils/cardImageSetting';
import { X, Upload, RotateCcw, Check, Eye } from 'lucide-react';
import { sounds } from '../utils/sound';

interface CardImageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CardImageModal: React.FC<CardImageModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'icon' | 'back' | 'front'>('icon');
  const [currentFrontImage, setCurrentFrontImage] = useState<string>(getStoredCardImage());
  const [currentBackImage, setCurrentBackImage] = useState<string>(getStoredCardBackImage());
  const [currentAppIcon, setCurrentAppIcon] = useState<string>(getStoredAppIcon());
  const [isEnabled, setIsEnabled] = useState<boolean>(isCardImageEnabled());
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentFrontImage(getStoredCardImage());
      setCurrentBackImage(getStoredCardBackImage());
      setCurrentAppIcon(getStoredAppIcon());
      setIsEnabled(isCardImageEnabled());
      setStatusMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDefaultFront = currentFrontImage === DEFAULT_CARD_IMAGE;
  const isDefaultBack = currentBackImage === DEFAULT_CARD_BACK_IMAGE;
  const isDefaultIcon = currentAppIcon === DEFAULT_APP_ICON;

  const handleFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('画像ファイル（PNG、JPG、WEBPなど）を選択してください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setStoredCardImage(dataUrl);
        setCardImageEnabled(true);
        setCurrentFrontImage(dataUrl);
        setIsEnabled(true);
        sounds.playCard();
        setStatusMessage('表面のカスタム画像を適用しました！');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('画像ファイル（PNG、JPG、WEBPなど）を選択してください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setStoredCardBackImage(dataUrl);
        setCurrentBackImage(dataUrl);
        sounds.playCard();
        setStatusMessage('裏面のカスタム画像を適用しました！');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetFrontDefault = () => {
    resetCardImageToDefault();
    setCurrentFrontImage(DEFAULT_CARD_IMAGE);
    setIsEnabled(true);
    sounds.selectCard();
    setStatusMessage('表面を用意された公式画像に戻しました！');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleResetBackDefault = () => {
    resetCardBackImageToDefault();
    setCurrentBackImage(DEFAULT_CARD_BACK_IMAGE);
    sounds.selectCard();
    setStatusMessage('裏面を指定の切り抜き画像に戻しました！');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('画像ファイル（PNG、JPG、WEBPなど）を選択してください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setStoredAppIcon(dataUrl);
        setCurrentAppIcon(dataUrl);
        sounds.playCard();
        setStatusMessage('アプリアイコン・ヘッダーアイコンを変更しました！');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetIconDefault = () => {
    resetAppIconToDefault();
    setCurrentAppIcon(DEFAULT_APP_ICON);
    sounds.selectCard();
    setStatusMessage('アイコンを指定の名探偵アイコンに戻しました！');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleToggleEnabled = () => {
    const next = !isEnabled;
    setCardImageEnabled(next);
    setIsEnabled(next);
    sounds.selectCard();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-md w-full bg-slate-900 border-2 border-purple-500/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scale-up"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 text-white flex items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <div>
              <h2 className="text-lg font-black tracking-tight">カード画像の適用・設定</h2>
              <p className="text-[11px] text-purple-100">カードの表面・裏面イラストをカスタマイズできます</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switch */}
        <div className="flex border-b border-white/10 bg-slate-950/60 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('icon')}
            className={`flex-1 py-2 px-1 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'icon'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
            }`}
          >
            <span>🕵️</span>
            <span>アイコン</span>
          </button>
          <button
            onClick={() => setActiveTab('back')}
            className={`flex-1 py-2 px-1 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'back'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
            }`}
          >
            <span>🎭</span>
            <span>カード裏面</span>
          </button>
          <button
            onClick={() => setActiveTab('front')}
            className={`flex-1 py-2 px-1 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'front'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
            }`}
          >
            <span>✨</span>
            <span>カード表面</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-stone-200 text-xs">
          {/* Status Alert Banner */}
          {statusMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 flex items-center gap-2 font-bold animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {activeTab === 'icon' ? (
            /* App & Header Icon Tab Content */
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-stone-400 font-bold mb-0.5">アイコンの状態</div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>{isDefaultIcon ? '指定の名探偵アイコン' : 'カスタムアイコン'}</span>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-400/40 text-[10px] text-amber-300 font-bold">
                  ヘッダー・タブに適用中
                </div>
              </div>

              {/* Preview Box for Icon */}
              <div className="rounded-2xl bg-black/50 border border-white/10 p-4 text-center flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-3 px-1">
                  <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    現在のゲームアイコンプレビュー
                  </span>
                  {isDefaultIcon && (
                    <span className="text-[10px] text-amber-300 font-bold">指定アイコン</span>
                  )}
                </div>

                <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400/80 relative bg-slate-950 p-1 flex items-center justify-center">
                  <img
                    src={currentAppIcon}
                    alt="App Icon Preview"
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_APP_ICON;
                    }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-2.5">
                  ※ ゲーム画面ヘッダー左やブラウザタブのファビコンに反映されます
                </p>
              </div>

              {/* Actions for Icon */}
              <div className="space-y-2">
                <input
                  ref={iconFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconUpload}
                />
                <button
                  onClick={() => iconFileInputRef.current?.click()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>別のアイコン画像をアップロード</span>
                </button>

                {!isDefaultIcon && (
                  <button
                    onClick={handleResetIconDefault}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-stone-300 hover:text-white font-bold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>指定の名探偵アイコンに戻す</span>
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'back' ? (
            /* Card Back Tab Content */
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-stone-400 font-bold mb-0.5">裏面画像の状態</div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span>{isDefaultBack ? '指定の公式切り抜き裏面' : 'カスタム裏面'}</span>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-blue-950 border border-blue-400/40 text-[10px] text-blue-300 font-bold">
                  裏面適用中
                </div>
              </div>

              {/* Preview Box for Back */}
              <div className="rounded-2xl bg-black/50 border border-white/10 p-3 text-center flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-2 px-1">
                  <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    適用中の裏面プレビュー（切り抜き済み）
                  </span>
                  {isDefaultBack && (
                    <span className="text-[10px] text-amber-300 font-bold">指定裏面</span>
                  )}
                </div>

                <div className="w-28 h-40 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400/80 relative bg-slate-950">
                  <img
                    src={currentBackImage}
                    alt="Card Back Preview"
                    className="w-full h-full object-fill rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
                    }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-2">
                  ※ 白フチを綺麗に切り抜いた高精細なカード裏面です
                </p>
              </div>

              {/* Actions for Back */}
              <div className="space-y-2">
                <input
                  ref={backFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBackUpload}
                />
                <button
                  onClick={() => backFileInputRef.current?.click()}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>別の裏面画像をアップロード</span>
                </button>

                {!isDefaultBack && (
                  <button
                    onClick={handleResetBackDefault}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-stone-300 hover:text-white font-bold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>指定の切り抜き裏面画像に戻す</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Card Front Tab Content */
            <div className="space-y-3.5">
              {/* Current State Info */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-stone-400 font-bold mb-0.5">現在の表示モード</div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    {isEnabled ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>画像カード適用中</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                          {isDefaultFront ? '用意された公式画像' : 'カスタム画像'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-stone-500" />
                        <span>シンプル文字カード</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <button
                  onClick={handleToggleEnabled}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center gap-1 ${
                    isEnabled
                      ? 'bg-purple-600/80 border-purple-400 text-white hover:bg-purple-500'
                      : 'bg-slate-800 border-white/10 text-stone-400 hover:text-white'
                  }`}
                >
                  {isEnabled ? '画像ON' : '画像OFF'}
                </button>
              </div>

              {/* Image Preview Box */}
              <div className="rounded-2xl bg-black/50 border border-white/10 p-2.5 text-center">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    表面プレビュー（全12枚カードシート）
                  </span>
                  {isDefaultFront && (
                    <span className="text-[10px] text-amber-300 font-bold">公式画像</span>
                  )}
                </div>

                <div className="relative rounded-xl overflow-hidden border border-white/20 bg-slate-950 max-h-48 flex items-center justify-center">
                  <img
                    src={currentFrontImage}
                    alt="Card Sheet"
                    className="w-full h-auto object-contain max-h-48"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_CARD_IMAGE;
                    }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1.5">
                  ※ 4列×3行（全12枚）の画像を各カードの位置に合わせて自動配置します
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <input
                  ref={frontFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFrontUpload}
                />

                <button
                  onClick={() => frontFileInputRef.current?.click()}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>表面の画像をアップロード</span>
                </button>

                {!isDefaultFront && (
                  <button
                    onClick={handleResetFrontDefault}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-stone-300 hover:text-white font-bold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>表面を公式画像（デフォルト）に戻す</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            完了して閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
