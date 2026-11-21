<script lang="ts">
  /** Текстовое поле; multiline — растущая textarea. */
  let {
    value = $bindable(),
    label = '',
    placeholder = '',
    multiline = false,
    rows = 3,
    serif = false,
  }: { value: string; label?: string; placeholder?: string; multiline?: boolean; rows?: number; serif?: boolean } = $props();

  let ta: HTMLTextAreaElement | undefined = $state();
  function grow() {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 4 + 'px';
  }
  $effect(() => {
    void value;
    grow();
  });
</script>

<label class="tf">
  {#if label}<span class="label">{label}</span>{/if}
  {#if multiline}
    <textarea bind:this={ta} class="field" class:serif {rows} {placeholder} bind:value oninput={grow}></textarea>
  {:else}
    <input class="field" class:serif type="text" {placeholder} bind:value enterkeyhint="done" />
  {/if}
</label>

<style>
  .tf {
    display: block;
    min-width: 0;
  }
  textarea {
    overflow: hidden;
  }
</style>
