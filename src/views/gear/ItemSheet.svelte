<script lang="ts">
  /** Карточка предмета: название, количество, магический, описание, удаление. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TextField from '../../components/TextField.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';
  import { linkedAttack, addWeaponAttack, removeWeaponAttack, removeItem, syncWeaponName } from '../../lib/rules/weapons';
  import { attackBonus, resolveDamageFormula, fmt, itemActive, attunedCount } from '../../lib/rules/calc';
  import AttackSheet from '../combat/AttackSheet.svelte';

  let { id }: { id: string } = $props();

  const item = $derived(charStore.current?.equipment.find((x) => x.id === id));
  const atk = $derived(charStore.current ? linkedAttack(charStore.current, id) : undefined);
  /** у предмета есть механика, которая что-то считает */
  const hasEffect = $derived(!!item && !!(item.armor || item.bonus || item.acBonus || item.saveBonus || item.setAbility));
  const showMech = $derived(!!item && (hasEffect || !!item.weapon || item.attune || !!item.resourceId));

  function armorLine(): string {
    const a = item!.armor!;
    if (a.kind === 'shield') return t('gear.armorShield', { base: a.base + item!.bonus });
    const dex = a.dexMax === null ? t('gear.armorDex') : a.dexMax === 0 ? '' : t('gear.armorDexMax', { n: a.dexMax });
    return t('gear.armorLine', { kind: t(`gear.kind.${a.kind}`), base: a.base + item!.bonus, dex });
  }

  // имя атаки следует за именем предмета
  $effect(() => {
    void item?.name;
    if (charStore.current && atk) syncWeaponName(charStore.current, id);
  });

  function setWeapon(on: boolean) {
    const c = charStore.current;
    if (!c || !item) return;
    if (on) addWeaponAttack(c, item);
    else charStore.update((ch) => removeWeaponAttack(ch, id), { undo: t('gear.weaponRemoved') });
  }

  async function remove() {
    if (!item) return;
    const name = item.name.trim() || t('gear.unnamed');
    const ok = await ui.confirm(t('gear.deleteItemConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    ui.closeSheet();
    charStore.update(
      (ch) => {
        removeItem(ch, id);
      },
      { undo: t('gear.deleted', { name }) },
    );
  }
</script>

{#if item}
  <SheetFrame kicker={t('gear.itemKicker')} title={item.name.trim() || t('gear.unnamed')} value={`×${item.qty}`}>
    <TextField bind:value={item.name} label={t('common.name')} serif />
    <div class="row qty">
      <span class="label grow">{t('gear.qty')}</span>
      <Stepper bind:value={item.qty} min={0} max={9999} />
    </div>
    {#if showMech}
      <div class="eff">
        <span class="label">{t('gear.effects')}{item.ref ? ` · ${t('gear.fromLib')}` : ''}</span>
        {#if item.armor}<div class="ln num">{armorLine()}</div>{/if}
        {#if item.weapon}
          <div class="ln num">
            {item.weapon.dice.replace('d', 'к')}{item.bonus ? ` +${item.bonus}` : ''} {item.weapon.type}{item.weapon.props.length ? ` · ${item.weapon.props.join(', ')}` : ''}
          </div>
        {/if}
        {#if item.bonus && !item.armor && !item.weapon}<div class="ln">{t('gear.effBonus')}: +{item.bonus}</div>{/if}
        {#if item.acBonus}<div class="ln">{t('gear.effAc')}: +{item.acBonus}{item.noArmor ? ` (${t('gear.effNoArmor')})` : ''}</div>{/if}
        {#if item.saveBonus}<div class="ln">{t('gear.effSave')}: +{item.saveBonus}</div>{/if}
        {#if item.setAbility}<div class="ln">{t('gear.effSet', { a: t(`ability.${item.setAbility}`), n: item.setValue })}</div>{/if}
        {#if item.resourceId}<div class="ln muted">{t('gear.effCharges')}</div>{/if}
        {#if item.armor && !charStore.current?.acAuto}<div class="ln muted small">{t('gear.armorAcHint')}</div>{/if}
        {#if hasEffect && !itemActive(item)}
          <div class="warn">
            {t('gear.effInactive', {
              what: t(`gear.effNeed.${!item.equipped && item.attune && !item.attuned ? 'both' : !item.equipped ? 'equip' : 'attune'}`),
            })}
          </div>
        {/if}
      </div>
      {#if hasEffect}<Toggle bind:checked={item.equipped} label={t('gear.equipped')} />{/if}
      {#if item.attune && charStore.current}
        <Toggle bind:checked={item.attuned} label={`${t('gear.attuned')} · ${t('gear.attuneCount', { n: attunedCount(charStore.current) })}`} />
        {#if attunedCount(charStore.current) > 3}<div class="warn">{t('gear.attuneTooMany')}</div>{/if}
      {/if}
      {#if ui.editing}
        <div class="steps">
          <div class="row"><span class="label grow">{t('gear.effBonus')}</span><Stepper bind:value={item.bonus} min={0} max={5} /></div>
          <div class="row"><span class="label grow">{t('gear.effAc')}</span><Stepper bind:value={item.acBonus} min={0} max={5} /></div>
          <div class="row"><span class="label grow">{t('gear.effSave')}</span><Stepper bind:value={item.saveBonus} min={0} max={5} /></div>
        </div>
      {/if}
    {/if}
    <Toggle bind:checked={item.magic} label={t('gear.magicToggle')} />
    <Toggle checked={!!atk} label={t('gear.weaponToggle')} onchange={setWeapon} />
    {#if atk && charStore.current}
      <div class="weapon">
        <span class="grow">
          <span class="wl">{t('gear.weaponIn')}</span>
          <span class="num">⚔ {fmt(attackBonus(charStore.current, atk))} · {resolveDamageFormula(charStore.current, atk)}{atk.damageType ? ` ${atk.damageType}` : ''}</span>
        </span>
        <button class="btn btn-outline" onclick={() => ui.openSheet(AttackSheet, { id: atk.id })}><Icon name="combat" size={18} />{t('gear.weaponSetup')}</button>
      </div>
    {/if}
    <TextField bind:value={item.text} label={t('gear.itemText')} placeholder={t('gear.itemTextPlaceholder')} multiline rows={6} serif />

    {#snippet footer()}
      <button class="btn btn-danger" onclick={remove}><Icon name="trash" size={20} />{t('common.delete')}</button>
      <div class="grow"></div>
      <button class="btn btn-ink" onclick={() => ui.closeSheet()}><Icon name="check" size={20} />{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .weapon {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(42, 31, 23, 0.07);
    flex-wrap: wrap;
  }
  .wl {
    display: block;
    font-size: 12px;
    color: var(--ink2);
  }
  .weapon .num {
    font-size: 17px;
  }
  .qty .label {
    margin: 0;
  }
  .eff {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(42, 31, 23, 0.07);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.3);
  }
  .eff .label {
    margin-bottom: 2px;
  }
  .ln {
    font-size: 15px;
  }
  .ln.num {
    font-size: 17px;
  }
  .small {
    font-size: 12.5px;
  }
  .warn {
    font-size: 13px;
    font-weight: 600;
    color: #8e2f20;
  }
  .steps {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .steps .label {
    margin: 0;
  }
</style>
