<script lang="ts">
  /** Числовое поле. nullable: пустое поле = null (для «ручного» значения). */
  let {
    value = $bindable(),
    label = '',
    placeholder = '',
    nullable = false,
    min,
    max,
    big = false,
    onchange,
  }: {
    value: number | null;
    label?: string;
    placeholder?: string;
    nullable?: boolean;
    min?: number;
    max?: number;
    big?: boolean;
    onchange?: (v: number | null) => void;
  } = $props();

  import { untrack } from 'svelte';

  const parse = (s: string) => {
    const t = s.trim().replace(',', '.').replace('−', '-');
    return t === '' ? null : Number(t);
  };

  let text = $state(value == null ? '' : String(value));
  /** пока поле в фокусе, набранный текст не перетирается значением снаружи */
  let editing = false;

  // реагируем только на изменение value снаружи (текст не отслеживаем — иначе ввод откатывается)
  $effect(() => {
    const v = value;
    untrack(() => {
      if (!editing && parse(text) !== v) text = v == null ? '' : String(v);
    });
  });

  function commit(final = false) {
    const s = text.trim().replace(',', '.').replace('−', '-');
    let v: number | null;
    if (s === '' || s === '-') v = nullable ? null : (min ?? 0);
    else {
      v = Number(s);
      if (!Number.isFinite(v)) v = nullable ? null : (value ?? 0);
      else {
        v = Math.round(v);
        if (min != null) v = Math.max(min, v);
        if (max != null) v = Math.min(max, v);
      }
    }
    value = v;
    onchange?.(v);
    if (final) text = v == null ? '' : String(v);
  }

  function onInput(e: Event) {
    text = (e.currentTarget as HTMLInputElement).value;
    const s = text.trim().replace('−', '-');
    // промежуточные состояния («», «-») не сохраняем — только целые числа
    if (/^-?\d+$/.test(s)) commit();
    else if (s === '' && nullable) commit();
  }
</script>

<label class="nf" class:big>
  {#if label}<span class="label">{label}</span>{/if}
  <input
    class="field num"
    type="text"
    inputmode="numeric"
    enterkeyhint="done"
    {placeholder}
    value={text}
    oninput={onInput}
    onblur={() => {
      editing = false;
      commit(true);
    }}
    onfocus={(e) => {
      editing = true;
      (e.currentTarget as HTMLInputElement).select();
    }}
  />
</label>

<style>
  .nf {
    display: block;
    min-width: 0;
  }
  input {
    text-align: center;
    font-size: 18px;
  }
  .big input {
    font-size: 28px;
    min-height: 56px;
  }
</style>
