// Карточка «Синхронизация» в профиле и на первом экране: ввод секретного кода и состояние обмена.
import { tx } from './i18n.js';
import { h, toast } from './ui.js';
import { syncAvailable, syncOn, syncCode, syncNow, linkSync, unlinkSync, newCode, syncStatus, onSyncStatus } from './sync.js';

function statusText() {
  const s = syncStatus();
  if (s.state === 'busy') return tx('Синхронизирую…');
  if (s.state === 'error') return tx('Нет связи с облаком. Попробую ещё раз, когда появится интернет.');
  if (s.state === 'ok') return tx`Синхронизировано в ${new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return tx('Ещё не синхронизировано');
}

// onLinked вызывается после успешного подключения (на первом экране — чтобы перейти к курсу).
export function syncCard(onLinked) {
  if (!syncAvailable()) return null;
  const card = h('div', { class: 'card stack sync' });
  const off = onSyncStatus(() => { if (!card.isConnected) { off(); return; } if (syncOn()) draw(); });

  function draw() {
    card.innerHTML = '';
    if (syncOn()) {
      card.append(
        h('div', { class: 'small muted', text: tx('Прогресс одинаковый на всех телефонах, где введён этот код. Никому его не показывайте.') }),
        h('div', { class: 'sync__code', text: syncCode() }),
        h('div', { class: 'small muted', role: 'status', text: statusText() }),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => syncNow() }, tx('Синхронизировать сейчас')),
        h('button', { class: 'btn btn--link', type: 'button', onclick: () => {
          if (!confirm(tx('Отключить синхронизацию на этом телефоне? Прогресс останется и здесь, и в облаке.'))) return;
          unlinkSync();
          draw();
        } }, tx('Отключить на этом телефоне')));
      return;
    }
    const inp = h('input', { class: 'field', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: tx('Секретный код, от 8 знаков'), 'aria-label': tx('Секретный код') });
    const btn = h('button', { class: 'btn', type: 'button' }, tx('Подключить'));
    btn.addEventListener('click', async () => {
      if (inp.value.trim().replace(/\s+/g, '').length < 8) { toast(tx('Код слишком короткий: нужно от 8 знаков')); inp.focus(); return; }
      btn.disabled = true;
      try {
        await linkSync(inp.value);
        toast(tx('Готово: прогресс синхронизируется'));
        draw();
        onLinked?.();
      } catch (err) {
        console.warn(err);
        btn.disabled = false;
        toast(tx('Не получилось подключиться. Проверьте интернет.'));
      }
    });
    card.append(
      h('div', { class: 'small muted', text: tx('Занимайтесь на двух телефонах — прогресс будет одинаковым. Придумайте секретный код и введите его на каждом телефоне.') }),
      inp, btn,
      h('button', { class: 'btn btn--link', type: 'button', onclick: () => { inp.value = newCode(); } }, tx('Придумать код за меня')));
  }
  draw();
  return card;
}
