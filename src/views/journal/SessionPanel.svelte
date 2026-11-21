<script lang="ts">
  /** Заглушка: режим записи сессии (Task 10). Получает запись текущей сессии. */
  import type { JournalEntry } from '../../lib/model/types';
  let { entry }: { entry: JournalEntry } = $props();
</script>

<div class="panel">session: {entry.title}</div>
