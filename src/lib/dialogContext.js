// ダイアログ / トーストの context と hook (#27)
//
// Provider 本体 (components/Dialogs.jsx) と分けているのは、コンポーネント以外の
// export が混ざると Vite の Fast Refresh が効かなくなるため
// (eslint: react-refresh/only-export-components)。
import { createContext, useContext } from 'react';

export const DialogContext = createContext(null);

function useDialogContext(name) {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error(`${name} must be used inside <DialogProvider>`);
  return ctx;
}

/** `await confirm({ message, danger })` — OK なら true。 */
export const useConfirm = () => useDialogContext('useConfirm').confirm;

/** `await prompt({ label, defaultValue })` — キャンセルは null（空文字と区別する）。 */
export const usePrompt = () => useDialogContext('usePrompt').prompt;

/** `toast.error(msg)` / `.success(msg)` / `.info(msg)`。 */
export const useToast = () => useDialogContext('useToast').toast;
