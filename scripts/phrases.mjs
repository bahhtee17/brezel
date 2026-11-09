// Сбор фраз для озвучки: ровно те строки, которые приложение передаёт в озвучку.
// Общий модуль для generate-audio.mjs (ElevenLabs) и generate-audio-local.mjs (VoiceStudio).
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Возвращает Map: немецкий текст -> кто говорит (ключ голоса). */
export async function collectPhrases(root) {
  const read = async p => JSON.parse(await readFile(path.join(root, p), 'utf8'));
  const course = await read('content/course.json');
  const items = new Map();
  const add = (text, who = 'default') => {
    const t = String(text ?? '').replace(/<[^>]+>/g, '').replace(/[_]+/g, '…').trim();
    if (!t || /[а-яё]/i.test(t) || t === '…') return;
    if (!items.has(t)) items.set(t, who);
  };
  const tokens = s => String(s).split(/\s+/).map(t => t.replace(/^[„“"«(]+|[.,!?;:„“"»)]+$/g, '')).filter(Boolean);

  function collectExercise(ex) {
    if (!ex || typeof ex !== 'object') return;
    const who = ex.who || 'default';
    add(ex.de, who); add(ex.line, who); add(ex.audio && typeof ex.audio === 'string' ? ex.audio : null, who);
    if (typeof ex.answer === 'string') { add(ex.answer); tokens(ex.answer).forEach(t => add(t)); (ex.distract || []).forEach(t => add(t)); }
    if (ex.type === 'gap' && ex.text) add(ex.text.replace('___', ex.options[ex.answer]));
    if (ex.type === 'tf') add(ex.statement);
    (ex.options || []).forEach(o => { if (typeof o === 'string') add(o); else if (o && o.de) add(o.de); });
    if (Array.isArray(ex.audio)) ex.audio.forEach(l => add(l.de, l.who));
    (ex.examples || []).forEach(e => add(e.de));
    (ex.accept || []).slice(0, 1).forEach(a => add(a));
  }

  for (const level of course.levels) {
    for (const t of level.topics) {
      if (!t.ready || !t.file) continue;
      const topic = await read(`content/${t.file}`);
      for (const w of topic.words) {
        add(w.art ? `${w.art} ${w.de}` : w.de);
        add(w.de);
        if (w.ex) add(w.ex.de);
      }
      for (const l of topic.lessons) {
        (l.scene?.lines || []).forEach(x => add(x.de, x.who));
        (l.exercises || []).forEach(collectExercise);
        (l.boss?.turns || []).forEach(collectExercise);
      }
      (topic.story?.sentences || []).forEach(s => add(s.de, s.who || 'f'));
      (topic.story?.questions || []).forEach(collectExercise);
      (topic.test?.parts || []).forEach(p => p.items.forEach(collectExercise));
    }
  }
  return items;
}
