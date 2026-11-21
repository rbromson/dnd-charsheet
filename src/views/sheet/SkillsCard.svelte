<script lang="ts">
  /** 18 навыков в две колонки + пассивная уважність последней строкой. */
  import ProfDot from './ProfDot.svelte';
  import SkillSheet from './SkillSheet.svelte';
  import PassiveSheet from './PassiveSheet.svelte';
  import Icon from '../../components/Icon.svelte';
  import { SKILLS, type SkillKey } from '../../lib/model/types';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmt, passivePerception, skillBonus } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const open = (key: SkillKey) => ui.openSheet(SkillSheet, { skill: key });
  function roll(key: SkillKey) {
    const s = c.skills[key];
    dice.askCheck({ kind: 'skill', label: t(`skill.${key}`), bonus: skillBonus(c, key), minD20: s.minD20 });
  }
  const openPassive = () => ui.openSheet(PassiveSheet, {});
</script>

<section class="card">
  <h3 class="card-title c">{t('sheet.skills')}</h3>
  <div class="list">
    {#each SKILLS as def (def.key)}
      {@const s = c.skills[def.key]}
      {@const swapped = s.ability !== def.ability}
      <button
        class="sk"
        class:editing={ui.editing}
        use:press={{ onTap: () => (ui.editing ? open(def.key) : roll(def.key)), onLong: () => open(def.key) }}
      >
        <ProfDot prof={s.prof} />
        <span class="b num" class:manual={s.override != null}>{fmt(skillBonus(c, def.key))}</span>
        <span class="n">
          {t(`skill.${def.key}`)}
          <span class="ab" class:sw={swapped}>{t(`abilityShort.${s.ability}`)}{swapped ? ' ⇄' : ''}</span>
          {#if s.note}<span class="note" title={t('sheet.hasNote')}><Icon name="feather" size={13} stroke={2} /></span>{/if}
        </span>
        {#if s.minD20}<span class="tag">{t('sheet.minTag', { n: s.minD20 })}</span>{/if}
      </button>
    {/each}
    <button class="sk passive" use:press={{ onTap: () => ui.editing && openPassive(), onLong: openPassive }}>
      <span class="dot-sp"></span>
      <span class="b num" class:manual={c.passivePerception.override != null}>{passivePerception(c)}</span>
      <span class="n">{t('sheet.passiveShort')}</span>
    </button>
  </div>
</section>

<style>
  .c {
    text-align: center;
  }
  .list {
    columns: 2;
    column-gap: 18px;
  }
  @container (max-width: 380px) {
    .list {
      columns: 1;
    }
  }
  .sk {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: var(--tap);
    break-inside: avoid;
    border-bottom: 1px dashed color-mix(in srgb, var(--ink2) 25%, transparent);
    font-size: 14px;
    text-align: left;
    user-select: none;
    color: var(--ink);
    padding: 2px 0;
  }
  .sk:active {
    background: color-mix(in srgb, var(--ember) 12%, transparent);
  }
  .b {
    width: 30px;
    flex-shrink: 0;
    text-align: right;
    font-size: 15.5px;
  }
  .manual {
    text-decoration: underline dotted;
    text-underline-offset: 3px;
  }
  .n {
    flex: 1;
    min-width: 0;
    line-height: 1.25;
  }
  .editing .n {
    text-decoration: underline dashed color-mix(in srgb, var(--ink2) 50%, transparent);
    text-underline-offset: 4px;
  }
  .ab {
    font-size: 11px;
    color: var(--ink2);
    white-space: nowrap;
    margin-left: 2px;
  }
  .ab.sw {
    color: var(--swap);
    font-weight: 700;
  }
  .note {
    display: inline-flex;
    vertical-align: -2px;
    color: var(--ink2);
    margin-left: 2px;
  }
  .tag {
    flex-shrink: 0;
  }
  .passive {
    color: var(--ink2);
  }
  .dot-sp {
    width: 14px;
    flex-shrink: 0;
  }
</style>
