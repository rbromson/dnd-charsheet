<script lang="ts">
  /** Настройки атаки. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TextField from '../../components/TextField.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import TweakEditor from '../../components/TweakEditor.svelte';
  import Icon from '../../components/Icon.svelte';
  import CalcLine from '../sheet/CalcLine.svelte';
  import { attackParts } from '../sheet/explain';
  import { ABILITIES, type Ability } from '../../lib/model/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { attackAuto, attackBonus, attackSaveDc, fmt, resolveDamageFormula, fullDamageFormula } from '../../lib/rules/calc';
  import { rollAttack as rollAttackFor } from './extras';
  import { uid } from '../../lib/model/ids';
  import { dieText } from '../../lib/i18n';
  import Segmented from '../../components/Segmented.svelte';
  import { t } from '../../lib/i18n';

  let { id }: { id: string } = $props();

  const c = $derived(charStore.current!);
  const idx = $derived(c ? c.attacks.findIndex((x) => x.id === id) : -1);
  const atk = $derived(idx >= 0 ? c.attacks[idx] : undefined);
  const abilityOptions: (Ability | null)[] = [...ABILITIES, null];

  function rollAttack() {
    if (!atk) return;
    rollAttackFor(c, atk);
    ui.closeSheet();
  }
  function addExtra() {
    atk?.extra.push({ id: uid(), dice: '1d6', type: '', when: t('combat.extraNewName'), crit: false });
  }
  // боєприпаси: предмети з кількістю (стріли, болти) і ресурси-лічильники
  const ammoOptions = $derived([
    ...c.equipment.filter((i) => !i.weapon && !i.armor && (i.qty > 1 || /боєприпас|ammunition|стріл|болт|arrow|bolt|кул|bullet|голк|needle/i.test(`${i.name} ${i.text}`))).map((i) => ({ id: i.id, name: `${i.name} · ${i.qty}` })),
    ...c.resources.map((r) => ({ id: r.id, name: `${r.name} · ${r.current}/${r.max}` })),
  ]);
  function rollDamage() {
    if (!atk) return;
    dice.rollDamage(t('combat.atkDamageLabel', { name: atk.name }), fullDamageFormula(c, atk));
    ui.closeSheet();
  }
</script>

{#if atk}
  <SheetFrame
    kicker={t('combat.atkKicker')}
    title={atk.name || t('combat.atkNew')}
    value={atk.save ? t('combat.atkDc', { dc: attackSaveDc(c, atk) }) : fmt(attackBonus(c, atk))}
  >
    <TextField label={t('combat.atkName')} bind:value={atk.name} serif />

    <div>
      <span class="label">{t('combat.atkMode')}</span>
      <Segmented
        value={atk.save ? 'save' : 'roll'}
        options={[
          { value: 'roll', label: t('combat.atkModeRoll') },
          { value: 'save', label: t('combat.atkModeSave') },
        ]}
        onchange={(v) => (atk.save = v === 'save' ? (atk.save ?? 'wis') : null)}
      />
    </div>
    {#if atk.save}
      <div>
        <span class="label">{t('combat.atkSaveAbility')}</span>
        <div class="abs six">
          {#each ABILITIES as a (a)}
            <button class="chip" class:on={atk.save === a} aria-pressed={atk.save === a} onclick={() => (atk.save = a)}>{t(`abilityShort.${a}`)}</button>
          {/each}
        </div>
        <div class="hint">{t('combat.atkSaveHint')} = <b>{attackSaveDc(c, atk)}</b></div>
      </div>
    {/if}

    <div>
      <span class="label">{t('combat.atkAbility')}</span>
      <div class="abs">
        {#each abilityOptions as a (a ?? 'none')}
          <button class="chip" class:on={atk.ability === a} aria-pressed={atk.ability === a} onclick={() => (atk.ability = a)}>
            {a ? t(`abilityShort.${a}`) : '—'}
          </button>
        {/each}
      </div>
    </div>

    {#if !atk.save}
      <Toggle label={t('combat.atkProf')} bind:checked={atk.prof} />
      <TweakEditor bind:tweak={c.attacks[idx]} auto={attackAuto(c, atk)} />
      <CalcLine parts={attackParts(c, atk)} total={attackAuto(c, atk)} override={atk.override} />
    {/if}

    <div class="two">
      <div>
        <TextField label={t('combat.atkDamage')} bind:value={atk.damage} placeholder={t('combat.atkDamagePh')} />
        <div class="hint">
          {t('combat.atkDamageHint')}{#if atk.damage.trim()} · <b>{t('combat.atkResolved', { f: resolveDamageFormula(c, atk) })}</b>{/if}
        </div>
      </div>
      <TextField label={t('combat.atkDamageType')} bind:value={atk.damageType} placeholder={t('combat.atkDamageTypePh')} />
    </div>

    <!-- свій доп. урон: «Скрита атака 2к6» — на вибір у вікні кидка (подвоюється на криті) -->
    <div class="xd">
      <span class="label">{t('combat.extraTitle')}</span>
      {#each atk.extra as x, i (x.id)}
        <div class="xrow">
          <div class="xd-d"><TextField bind:value={x.dice} placeholder="2d6" /></div>
          <div class="grow"><TextField bind:value={x.when} placeholder={t('combat.extraNamePh')} /></div>
          <button class="btn btn-ghost x" aria-label={t('common.delete')} onclick={() => atk.extra.splice(i, 1)}><Icon name="trash" size={16} /></button>
        </div>
        <Toggle
          checked={!x.when}
          label={t('combat.extraAlways', { d: dieText(x.dice) })}
          onchange={(v: boolean) => (x.when = v ? '' : x.when || t('combat.extraNewName'))}
        />
      {/each}
      <button class="btn btn-ghost addx" onclick={addExtra}><Icon name="plus" size={18} />{t('combat.extraAdd')}</button>
      <div class="hint">{t('combat.extraHint')}</div>
    </div>

    {#if !atk.save}
      <label class="ammo">
        <span class="label">{t('combat.ammo')}</span>
        <select class="field" value={atk.ammoId ?? ''} onchange={(e) => (atk.ammoId = (e.currentTarget as HTMLSelectElement).value || null)}>
          <option value="">{t('combat.ammoNone')}</option>
          {#each ammoOptions as o (o.id)}<option value={o.id}>{o.name}</option>{/each}
        </select>
      </label>
    {/if}

    <TextField label={t('combat.atkNote')} bind:value={atk.note} multiline rows={2} />

    {#snippet footer()}
      {#if !atk!.save}
        <button class="btn btn-ink grow" onclick={rollAttack}><Icon name="combat" size={20} />{t('combat.atkRoll')} {fmt(attackBonus(c, atk!))}</button>
      {/if}
      {#if atk!.damage.trim()}
        <button class="btn btn-outline grow" onclick={rollDamage}><Icon name="dice" size={20} />{fullDamageFormula(c, atk!)}</button>
      {/if}
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .abs {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 5px;
  }
  .abs.six {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .abs .chip {
    min-height: var(--tap);
    min-width: 0;
    justify-content: center;
    padding: 0 2px;
    font-weight: 600;
  }
  .two {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 12px;
    align-items: start;
  }
  .xd,
  .ammo {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .xrow {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }
  .xd-d {
    width: 90px;
    flex-shrink: 0;
  }
  .x {
    width: 36px;
    padding: 0;
    flex-shrink: 0;
  }
  .addx {
    align-self: flex-start;
    padding: 0 6px;
  }
  .hint {
    font-size: 12px;
    color: var(--ink2);
    margin-top: 4px;
  }
</style>
