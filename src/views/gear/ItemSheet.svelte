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
  import { attackBonus, resolveDamageFormula, fmt } from '../../lib/rules/calc';
  import AttackSheet from '../combat/AttackSheet.svelte';

  let { id }: { id: string } = $props();

  const item = $derived(charStore.current?.equipment.find((x) => x.id === id));
  const atk = $derived(charStore.current ? linkedAttack(charStore.current, id) : undefined);

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
</style>
