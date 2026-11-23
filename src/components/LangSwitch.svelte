<script lang="ts">
  /** Українська / English — переключение языка интерфейса (перезагружает страницу). */
  import Segmented from './Segmented.svelte';
  import { lang, setLang, t, type Lang } from '../lib/i18n';
  import { rememberTab, ui } from '../lib/stores/ui.svelte';
</script>

<div class="ls">
  <span class="label">{t('lang.title')}</span>
  <Segmented
    value={lang}
    options={[
      { value: 'uk', label: t('lang.uk') },
      { value: 'en', label: t('lang.en') },
    ]}
    onchange={(v: Lang) => {
      if (v === lang) return;
      rememberTab(ui.tab);
      setLang(v);
    }}
  />
</div>

<style>
  .ls {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
</style>
