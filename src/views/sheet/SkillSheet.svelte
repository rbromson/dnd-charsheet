<script lang="ts">
  /** Карточка навыка (макет, раздел 5). */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import TextField from '../../components/TextField.svelte';
  import Icon from '../../components/Icon.svelte';
  import CalcLine from './CalcLine.svelte';
  import { skillParts } from './explain';
  import { ABILITIES, SKILLS, type Prof, type SkillKey } from '../../lib/model/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmt, skillAuto, skillBonus } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  let { skill }: { skill: SkillKey } = $props();

  const c = $derived(charStore.current!);
  const s = $derived(c?.skills[skill]);
  const def = $derived(SKILLS.find((x) => x.key === skill)?.ability ?? 'wis');
  const name = $derived(t(`skill.${skill}`));

  const profOptions: { value: Prof; label: string }[] = [
    { value: 0, label: t('sheet.prof.0') },
    { value: 1, label: t('sheet.prof.1') },
    { value: 2, label: t('sheet.prof.2') },
  ];

  function roll() {
    dice.rollCheck({ kind: 'skill', label: name, bonus: skillBonus(c, skill), minD20: s.minD20 });
    ui.closeSheet();
  }
</script>

{#if c && s}
  <SheetFrame kicker={t('sheet.skillKicker')} title={name} value={fmt(skillBonus(c, skill))}>
    <div>
      <span class="label">{t('sheet.prof')}</span>
      <Segmented bind:value={s.prof} options={profOptions} />
    </div>

    <div>
      <span class="label">{t('sheet.ability')}</span>
      <div class="abs">
        {#each ABILITIES as a (a)}
          <button class="chip" class:on={s.ability === a} aria-pressed={s.ability === a} onclick={() => (s.ability = a)}>
            {t(`abilityShort.${a}`)}
          </button>
        {/each}
      </div>
      {#if s.ability !== def}
        <button class="swap" onclick={() => (s.ability = def)}>
          {t('sheet.swapHint', { ability: t(`ability.${def}`) })}
          <span class="back">{t('sheet.swapBack')}</span>
        </button>
      {/if}
    </div>

    <div class="trio">
      <div>
        <span class="label">{t('common.extraBonus')}</span>
        <Stepper bind:value={s.bonus} min={-20} max={20} />
      </div>
      <NumberField label={t('sheet.minD20')} bind:value={s.minD20} nullable min={1} max={20} placeholder="—" />
      <NumberField
        label={t('common.manual')}
        bind:value={s.override}
        nullable
        placeholder={`${t('common.auto')} ${fmt(skillAuto(c, skill))}`}
      />
    </div>
    <p class="muted hint">{t('sheet.minD20Hint')}</p>

    <CalcLine parts={skillParts(c, skill)} total={skillAuto(c, skill)} override={s.override} />

    <TextField label={t('common.note')} bind:value={s.note} multiline rows={2} placeholder={t('sheet.notePh')} />

    {#snippet footer()}
      <button class="btn btn-ink grow" onclick={roll}>
        <Icon name="dice" size={20} />{t('sheet.roll')} {fmt(skillBonus(c, skill))}
        {#if s.minD20}<span class="tag">{t('sheet.minTag', { n: s.minD20 })}</span>{/if}
      </button>
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .abs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .abs .chip {
    min-height: var(--tap);
    min-width: 56px;
    justify-content: center;
    padding: 0 12px;
    font-weight: 600;
  }
  .swap {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: var(--tap);
    width: 100%;
    text-align: left;
    font-size: 12.5px;
    color: var(--swap);
    font-weight: 600;
  }
  .back {
    margin-left: auto;
    text-decoration: underline;
    color: var(--ink2);
    font-weight: 500;
  }
  .trio {
    display: grid;
    grid-template-columns: auto 1fr 1fr;
    gap: 12px;
    align-items: end;
  }
  @media (max-width: 460px) {
    .trio {
      grid-template-columns: 1fr 1fr;
    }
  }
  .hint {
    margin: -6px 0 0;
    font-size: 12px;
  }
  .tag {
    background: var(--parch);
    color: var(--ink);
  }
</style>
