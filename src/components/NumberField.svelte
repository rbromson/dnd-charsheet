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

  let text = $state(value == null ? '' : String(value));
  $effect(() => {
    const v = value;
    const cur = text.trim() === '' ? null : Number(text.replace(',', '.').replace('−', '-'));
    if (cur !== v) text = v == null ? '' : String(v);
  });

  function commit() {
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
    bind:value={text}
    oninput={() => {
      const s = text.trim().replace('−', '-');
      if (/^-?\d+$/.test(s)) commit();
      else if (s === '' && nullable) commit();
    }}
    onblur={commit}
    onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
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
