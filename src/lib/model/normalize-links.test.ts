import { describe, it, expect } from 'vitest';
import { normalizeCharacter, normalizeEntry, normalizeCodex } from './normalize';
import { newCharacter } from './defaults';
import { removeItem } from '../rules/weapons';

describe('decks live on items', () => {
  it('links an old standalone deck to the item with the same name', () => {
    const c = newCharacter();
    c.equipment = [{ ...c.equipment[0], id: 'i1', name: 'Колода ілюзій' } as never];
    const raw = { ...c, equipment: [{ id: 'i1', name: 'Колода ілюзій', qty: 1 }], decks: [{ id: 'd1', name: 'Колода ілюзій', cards: ['a'], drawn: [] }] };
    const n = normalizeCharacter(raw);
    expect(n.equipment.find((i) => i.id === 'i1')?.deckId).toBe('d1');
  });

  it('creates an item for a deck without a matching item', () => {
    const n = normalizeCharacter({ ...newCharacter(), equipment: [], decks: [{ id: 'd2', name: 'Таро', cards: [], drawn: [] }] });
    const owner = n.equipment.find((i) => i.deckId === 'd2');
    expect(owner?.name).toBe('Таро');
    expect(owner?.magic).toBe(true);
  });

  it('drops a dangling deckId and removes the deck with its item', () => {
    const n = normalizeCharacter({ ...newCharacter(), equipment: [{ id: 'i3', name: 'X', qty: 1, deckId: 'gone' }], decks: [] });
    expect(n.equipment[0].deckId).toBeNull();
    const m = normalizeCharacter({ ...newCharacter(), equipment: [], decks: [{ id: 'd4', name: 'Y', cards: [], drawn: [] }] });
    const item = m.equipment.find((i) => i.deckId === 'd4')!;
    removeItem(m, item.id);
    expect(m.decks).toHaveLength(0);
  });
});

describe('incomplete journal and codex entries', () => {
  it('fills missing fields with defaults', () => {
    const e = normalizeEntry({ id: 'j', characterId: 'c', title: 'S1' } as never);
    expect(e.secret).toBe('');
    expect(e.images).toEqual([]);
    expect(e.transcript).toEqual([]);
    expect(e.kind).toBe('session');
    const x = normalizeCodex({ name: 'Мірра' } as never);
    expect(x.kind).toBe('npc');
    expect(x.status).toBe('');
    expect(x.portraitId).toBeNull();
  });
});
