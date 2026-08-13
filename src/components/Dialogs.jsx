// アプリ内ダイアログ / トースト (#27)
//
// 破壊的操作の確認に `confirm()`、エラー表示に `alert()`、入力に `prompt()` を
// 使っていた（13箇所）。ネイティブダイアログは
//   - 見た目がアプリと揃わない
//   - ブラウザによってはサイト単位で無効化できる（＝確認なしで実行される）
//   - スタイルもテキストも制御できない
// ので、同じ使い勝手（await 一行で結果が返る）のまま置き換える。
//
// 使い方:
//   const confirm = useConfirm();
//   if (!await confirm({ message: 'Revoke session?' })) return;
//
//   const toast = useToast();
//   toast.error(err.message);
//
//   const prompt = usePrompt();
//   const email = await prompt({ label: 'Email' });   // null ならキャンセル
import { useState, useCallback, useRef, useMemo } from 'react';
import { DialogContext } from '../lib/dialogContext';

const btnBase = 'px-3 py-1.5 text-sm rounded transition-colors';

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);
  const resolveRef = useRef(null);
  const toastIdRef = useRef(0);

  const close = useCallback((value) => {
    setDialog(null);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolveRef.current = resolve;
    setDialog({ kind: 'confirm', ...opts });
  }), []);

  const prompt = useCallback((opts) => new Promise((resolve) => {
    resolveRef.current = resolve;
    setDialog({ kind: 'prompt', value: opts.defaultValue ?? '', ...opts });
  }), []);

  const pushToast = useCallback((level, message) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, level, message }]);
    // 自動で消える。エラーは読む時間が要るので長めにする。
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, level === 'error' ? 8000 : 4000);
  }, []);

  const toast = useMemo(() => ({
    error: (m) => pushToast('error', m),
    success: (m) => pushToast('success', m),
    info: (m) => pushToast('info', m),
  }), [pushToast]);

  const value = useMemo(() => ({ confirm, prompt, toast }), [confirm, prompt, toast]);

  return (
    <DialogContext.Provider value={value}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog" aria-modal="true"
          onKeyDown={(e) => { if (e.key === 'Escape') close(dialog.kind === 'prompt' ? null : false); }}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 w-full max-w-md mx-4">
            {dialog.title && <h3 className="text-white font-bold mb-2">{dialog.title}</h3>}
            <p className="text-gray-300 text-sm whitespace-pre-line">{dialog.message}</p>

            {dialog.kind === 'prompt' && (
              <div className="mt-3">
                {dialog.label && <label className="block text-xs text-gray-400 mb-1">{dialog.label}</label>}
                <input
                  autoFocus
                  value={dialog.value}
                  onChange={(e) => setDialog(d => ({ ...d, value: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') close(dialog.value); }}
                  className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => close(dialog.kind === 'prompt' ? null : false)}
                className={`${btnBase} bg-gray-700 text-gray-200 hover:bg-gray-600`}>
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                autoFocus={dialog.kind === 'confirm'}
                onClick={() => close(dialog.kind === 'prompt' ? dialog.value : true)}
                className={`${btnBase} ${dialog.danger
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {dialog.confirmLabel || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <div key={t.id}
            role={t.level === 'error' ? 'alert' : 'status'}
            className={`px-4 py-2 rounded shadow-lg text-sm max-w-sm ${
              t.level === 'error' ? 'bg-red-900 text-red-100 border border-red-700'
                : t.level === 'success' ? 'bg-green-900 text-green-100 border border-green-700'
                  : 'bg-gray-800 text-gray-200 border border-gray-700'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}
