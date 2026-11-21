<script lang="ts">
  /**
   * Текст с @-упоминаниями: упоминания — цветные «чипы» по типу (NPC — вино, місце — бірюза, завдання — охра).
   * Неизвестное имя — пунктирная рамка. Тап по чипу → onopen(id) или переход в журнал к карточке.
   * <MentionText text={entry.text} onopen={(id) => …} />
   */
  import { splitMentions } from '../lib/mentions';
  import { codex } from '../lib/stores/codex.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
  import type { CodexKind } from '../lib/model/types';

  let { text, onopen }: { text: string; onopen?: (codexId: string) => void } = $props();

  const GLYPH: Record<CodexKind, string> = { npc: '●', place: '◆', quest: '▲' };
  const parts = $derived(splitMentions(text));

  function open(e: MouseEvent, id: string) {
    e.stopPropagation();
    if (onopen) onopen(id);
    else {
      ui.journalFocus = { kind: 'codex', id };
      ui.go('journal');
    }
  }
</script>

<span class="mt">{#each parts as p, i (i)}{#if p.kind === 'text'}{p.text}{:else}{@const c = codex.byName(p.name)}{#if c}<button type="button" class="men {c.kind}" onclick={(e) => open(e, c.id)}><span class="g" aria-hidden="true">{GLYPH[c.kind]}</span>{p.name}</button>{:else}<span class="men unknown" title={t('journal.mention.unknown')}>{p.name}</span>{/if}{/if}{/each}</span>

<style>
  .mt {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .men {
    position: relative;
    display: inline;
    padding: 1px 7px;
    border-radius: 8px;
    font-weight: 600;
    font-size: inherit;
    line-height: inherit;
    white-space: nowrap;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  /* увеличенная зона касания без изменения межстрочного интервала */
  button.men::after {
    content: '';
    position: absolute;
    inset: -10px -3px;
  }
  .g {
    font-size: 0.7em;
    margin-right: 4px;
    vertical-align: 0.12em;
  }
  .npc {
    color: var(--wine);
    background: color-mix(in srgb, var(--wine) 14%, transparent);
  }
  .place {
    color: var(--teal);
    background: color-mix(in srgb, var(--teal) 14%, transparent);
  }
  .quest {
    color: color-mix(in srgb, var(--ochre) 78%, var(--ink));
    background: color-mix(in srgb, var(--ochre) 17%, transparent);
  }
  .unknown {
    color: inherit;
    font-weight: 500;
    outline: 1.5px dashed currentColor;
    outline-offset: -1.5px;
    opacity: 0.75;
  }
  button.men:active {
    filter: brightness(0.85);
  }
</style>
