// アプリ内ダイアログの挙動を固定する (#27, #22)
//
// ネイティブ confirm/prompt からの置き換えなので、「同じ意味の値が返る」ことが
// 一番大事。特に prompt のキャンセル(null)と空文字("")の区別を崩すと、
// Invitations の「誰でも使える招待」が作れなくなる。
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DialogProvider } from './Dialogs';
import { useConfirm, usePrompt, useToast } from '../lib/dialogContext';

/** hook を呼ぶだけの土台。押した結果を data 属性に出す。 */
function Harness({ onReady }) {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const toast = useToast();
  onReady({ confirm, prompt, toast });
  return null;
}

function setup() {
  const api = {};
  render(
    <DialogProvider>
      <Harness onReady={(v) => Object.assign(api, v)} />
    </DialogProvider>,
  );
  return api;
}

describe('DialogProvider', () => {
  it('confirm は OK で true、Cancel で false を返す', async () => {
    const user = userEvent.setup();
    const api = setup();

    let result = api.confirm({ message: 'Delete it?' });
    expect(await screen.findByText('Delete it?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(await result).toBe(true);

    result = api.confirm({ message: 'Delete it?' });
    expect(await screen.findByText('Delete it?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await result).toBe(false);
  });

  it('prompt は入力値を返し、キャンセルは null（空文字と区別する）', async () => {
    const user = userEvent.setup();
    const api = setup();

    let result = api.prompt({ label: 'Email' });
    const input = await screen.findByRole('textbox');
    await user.type(input, 'a@example.com');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(await result).toBe('a@example.com');

    // 何も入力せず OK → 空文字（「制限なし」の意味を持つ）
    result = api.prompt({ label: 'Email' });
    await screen.findByRole('textbox');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(await result).toBe('');

    // Cancel → null
    result = api.prompt({ label: 'Email' });
    await screen.findByRole('textbox');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await result).toBeNull();
  });

  it('prompt は defaultValue を初期値にする', async () => {
    const user = userEvent.setup();
    const api = setup();

    const result = api.prompt({ label: 'Role', defaultValue: 'MEMBER' });
    const input = await screen.findByRole('textbox');
    expect(input.value).toBe('MEMBER');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(await result).toBe('MEMBER');
  });

  it('danger 指定で確定ボタンが赤くなる（破壊的操作の見分け）', async () => {
    const api = setup();
    api.confirm({ message: 'Revoke?', danger: true });
    const ok = await screen.findByRole('button', { name: 'OK' });
    expect(ok.className).toContain('bg-red-600');
  });

  it('toast.error は alert 相当のメッセージを画面に出す', async () => {
    const api = setup();
    await act(async () => { api.toast.error('boom'); });
    expect(screen.getByRole('alert').textContent).toBe('boom');
  });
});
