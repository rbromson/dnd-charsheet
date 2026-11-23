<script lang="ts">
  /** «+ Сесія»: звичайний запис або «Режим сесії» — запис голосу за столом з розшифровкою. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Ways from '../../components/Ways.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  let { oncreate }: { oncreate: (voice: boolean) => void } = $props();

  function go(voice: boolean) {
    ui.closeSheet();
    oncreate(voice);
  }
</script>

<SheetFrame kicker={t('journal.box.session')} title={t('journal.newSessionAria')}>
  <Ways
    ways={[
      { icon: 'feather', label: t('journal.newPlain'), sub: t('journal.newPlainSub'), onclick: () => go(false), accent: true },
      { icon: 'mic', label: t('session.title'), sub: t('journal.newVoiceSub'), onclick: () => go(true) },
    ]}
  />
</SheetFrame>
