<script lang="ts">
  /** Карточка предмета: название, количество, магический, описание, удаление. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TextField from '../../components/TextField.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import Icon from '../../components/Icon.svelte';
  import { onDestroy, untrack } from 'svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t, dieText } from '../../lib/i18n';
  import { powerFormula } from '../../lib/rules/powers';
  import { linkedAttack, addWeaponAttack, removeWeaponAttack, removeItem, syncWeaponName } from '../../lib/rules/weapons';
  import { attackBonus, resolveDamageFormula, fmt, itemActive, attunedCount } from '../../lib/rules/calc';
  import AttackSheet from '../combat/AttackSheet.svelte';
  import DeckSheet from './DeckSheet.svelte';
  import ItemPowers from './ItemPowers.svelte';
  import ItemPowersEditor from './ItemPowersEditor.svelte';
  import { uid } from '../../lib/model/ids';

  /** fresh — только что созданный (вручну или из библиотеки): «Скасувати» / «Додати»; закрыли без «Додати» — предмета нет */
  let { id, fresh = false }: { id: string; fresh?: boolean } = $props();
  let confirmed = false;
  // черновик: в списке не показываем, пока не нажали «Додати»
  untrack(() => {
    if (!fresh) return;
    ui.draft = id;
    const it = charStore.current?.equipment.find((x) => x.id === id);
    if (it) it.draft = true;
  });

  onDestroy(() => {
    if (ui.draft === id) ui.draft = null;
    const c = charStore.current;
    if (fresh && !confirmed && c?.equipment.some((x) => x.id === id)) removeItem(c, id);
  });

  function confirmAdd() {
    confirmed = true;
    if (item) item.draft = false;
    ui.toast(t('add.added', { name: item?.name.trim() || t('gear.unnamed') }));
    ui.closeSheet();
  }

  const item = $derived(charStore.current?.equipment.find((x) => x.id === id));
  const atk = $derived(charStore.current ? linkedAttack(charStore.current, id) : undefined);
  /** свой предмет (не из библиотеки) в правке/новый — тогда видны редакторы зарядов, действий и колоды */
  const custom = $derived(!!item && (ui.editing || (fresh && !item.ref)));
  const charges = $derived(item?.resourceId ? charStore.current?.resources.find((r) => r.id === item.resourceId) : undefined);
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

  /** Колода карт предмета: появляется в «Спорядженні» рядом с ним, тянуть карты — там. */
  async function setDeck(on: boolean) {
    const c = charStore.current;
    if (!c || !item) return;
    if (on) {
      const did = uid();
      c.decks.push({ id: did, name: item.name, cards: [], drawn: [] });
      item.deckId = did;
      return;
    }
    const did = item.deckId;
    charStore.update(
      (ch) => {
        ch.decks = ch.decks.filter((d) => d.id !== did);
        const it = ch.equipment.find((x) => x.id === id);
        if (it) it.deckId = null;
      },
      { undo: t('gear.deckDeleted') },
    );
  }

  // имя колоды следует за именем предмета
  $effect(() => {
    const name = item?.name;
    const did = item?.deckId;
    const d = did ? charStore.current?.decks.find((x) => x.id === did) : undefined;
    if (d && name !== undefined && d.name !== name) d.name = name;
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
        <span class="label">{t('gear.effects')}{item.ref ? ` · ${t('gear.fromLib')}` : ''}{item.en && item.en !== item.name ? ` · ${item.en}` : ''}</span>
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
    <!-- колода — лише свій чарівний предмет у правці, або якщо вона вже є -->
    {#if (item.magic && custom) || item.deckId}
      <Toggle checked={!!item.deckId} label={t('gear.deckToggle')} onchange={setDeck} />
      {#if item.deckId}
        <div class="weapon">
          <span class="grow"><span class="wl">{t('gear.deckIn')}</span></span>
          <button class="btn btn-outline" onclick={() => item?.deckId && ui.openSheet(DeckSheet, { id: item.deckId })}><Icon name="edit" size={18} />{t('gear.deckSetup')}</button>
        </div>
      {/if}
    {/if}
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
    {#if custom}
      <!-- заряди й дії свого предмета (з бібліотеки вже заповнені) -->
      <ItemPowersEditor itemId={item.id} />
    {:else if fresh && item.powers.length}
      <div class="sum">
        {#each item.powers as p (p.id)}
          <span><b>{p.name}</b>{#if p.dice} · {dieText(powerFormula(p, Math.max(1, p.cost)))}{/if}{#if p.costMax} · {t('pw.upTo', { n: p.costMax })}{/if}</span>
        {/each}
        {#if charges}<span class="muted">{t('pw.charges', { n: charges.current, max: charges.max })}{#if charges.regain} · {t('pw.regain', { f: dieText(charges.regain) })}{/if}</span>{/if}
      </div>
    {:else if item.powers.length}
      <section>
        <span class="label">{t('pw.title')}</span>
        <ItemPowers itemId={item.id} />
      </section>
    {/if}
    <TextField bind:value={item.text} label={t('gear.itemText')} placeholder={t('gear.itemTextPlaceholder')} multiline rows={6} serif />

    {#snippet footer()}
      {#if fresh}
        <button class="btn btn-outline" onclick={() => ui.closeSheet()}>{t('common.cancel')}</button>
        <button class="btn btn-primary grow" onclick={confirmAdd}><Icon name="plus" size={20} />{t('add.confirm')}</button>
      {:else}
        <button class="btn btn-danger" onclick={remove}><Icon name="trash" size={20} />{t('common.delete')}</button>
        <div class="grow"></div>
        <button class="btn btn-ink" onclick={() => ui.closeSheet()}><Icon name="check" size={20} />{t('common.done')}</button>
      {/if}
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .sum {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 12px;
    border-radius: 3px;
    font-size: 14px;
    background: rgba(42, 31, 23, 0.05);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.35);
  }
  .sum .muted {
    color: var(--ink2);
    font-size: 13px;
  }
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
