<script lang="ts">
  /** «Додати»: з бібліотеки або вручну. Обидва шляхи ведуть у заповнену картку, яку ще можна змінити. */
  import SheetFrame from './SheetFrame.svelte';
  import Ways from './Ways.svelte';
  import { t } from '../lib/i18n';

  let {
    kicker,
    title,
    librarySub,
    manualSub,
    onlibrary,
    onmanual,
  }: { kicker: string; title: string; librarySub: string; manualSub: string; onlibrary: () => void; onmanual: () => void } = $props();
</script>

<SheetFrame {kicker} {title}>
  <Ways
    ways={[
      { icon: 'search', label: t('add.library'), sub: librarySub, onclick: onlibrary, accent: true, next: true },
      { icon: 'edit', label: t('add.manual'), sub: manualSub, onclick: onmanual, next: true },
    ]}
  />
</SheetFrame>
