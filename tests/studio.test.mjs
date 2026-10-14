import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { generate, validateProject } from '../dist/engine.js';

test('studio generation, locking, note editing, clipboard, history and mix work together', async () => {
  const window = new Window({ url: 'http://localhost:4174', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
  window.document.write(await readFile(new URL('../dist/index.html', import.meta.url), 'utf8'));
  const legacy = generate({ seed: 17 }); delete legacy.mix; delete legacy.locks; delete legacy.progression;
  window.localStorage.setItem('pocket-project', JSON.stringify(legacy));
  function Option(text, value) { const el = window.document.createElement('option'); el.text = text; el.value = String(value); return el; }
  Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage, Option, requestAnimationFrame: () => 0 });
  // Recording and audio are covered independently; this harness tests state and DOM behavior.
  window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  try {
    await import('../dist/app.js');
    const $ = id => document.getElementById(id), saved = () => JSON.parse(localStorage.getItem('pocket-project'));
    assert.equal(document.querySelectorAll('.step').length, 128);
    assert.equal(saved().locks.length, 8);
    $('interpret-idea').checked = false; $('style').value = 'drill'; $('mood').value = 'dark'; $('kit').value = 'heavy';
    $('vocalSpace').value = '85'; $('fillRate').value = '0'; $('bass-style').value = 'bouncy';
    $('generate').click(); assert.equal(saved().style, 'drill'); assert.equal(saved().kit, 'heavy'); assert.ok(validateProject(saved()));
    assert.equal(saved().vocalSpace, 85); assert.equal(saved().fillRate, 0); assert.equal(saved().bassStyle, 'bouncy');
    document.querySelector('[aria-label="Lock Keys during variation"]').click();
    const locked = saved().patterns.map(p => p[6]); $('variation').click(); assert.deepEqual(saved().patterns.map(p => p[6]), locked);
    assert.equal(saved().vocalSpace, 85); assert.equal(saved().fillRate, 0); assert.equal(saved().bassStyle, 'bouncy');
    $('edit-mode').checked = true;
    document.querySelector('[aria-label="Keys, bar 1, step 1, on"]').click();
    assert.equal($('note-editor').open, true); $('note-pitch').value = '72'; $('note-length').value = '3'; $('note-velocity').value = '60'; $('note-apply').click();
    assert.equal(saved().patterns[1][6][0].note, 72); assert.equal(saved().patterns[1][6][0].len, 3);
    $('copy-bar').click(); document.querySelector('[aria-label="Edit bar 2"]').click(); $('paste-bar').click();
    assert.deepEqual(saved().patterns[1][6].slice(0, 16), saved().patterns[1][6].slice(16, 32));
    $('clear-bar').click(); assert.ok(saved().patterns[1].every(row => row.slice(16, 32).every(n => n === null)));
    $('undo').click(); assert.equal(saved().patterns[1][6][16].note, 72);
    $('redo').click(); assert.equal(saved().patterns[1][6][16], null);
    $('reverb').value = '70'; $('reverb').dispatchEvent(new window.Event('input')); assert.equal(saved().mix.reverb, 70);
    $('add-section').click(); assert.equal(saved().arrangement.length, 7);
    const final = saved();
    const invalidNotes = final.patterns.flat(2).filter(n => n && (n.roll < 1 || n.len <= 0 || n.vel <= 0 || n.note < 12 || n.note > 108));
    assert.ok(validateProject(final), JSON.stringify({ ...final, patterns: invalidNotes })); assert.ok($('harmony-info').textContent.includes('Seed'));
  } finally {
    // The toast timer is intentional UI feedback; window.close cleans up the DOM harness.
    await new Promise(resolve => setTimeout(resolve, 3600));
    await window.happyDOM.close();
  }
});
