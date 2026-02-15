<script lang="ts">
  import { onMount } from 'svelte';
  import {
    calendarStore, loadEvents, loadTimeBlocks,
    addEvent, updateEvent, deleteEvent,
    addTimeBlock, deleteTimeBlock,
    setSelectedDate, setCalendarView,
    currentMonth,
  } from '../../stores/calendar';
  import type { CalendarEvent, TimeBlock } from '../../types';
  import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, addMonths, subMonths } from 'date-fns';

  onMount(async () => {
    await loadEvents();
    await loadTimeBlocks();
  });

  let showEventModal = false;
  let editingEvent: CalendarEvent | null = null;
  let eventForm = { title: '', description: '', start: '', end: '', color: '#58a6ff', all_day: false };

  let showBlockModal = false;
  let blockForm = { title: '', start: '', end: '', color: '#3fb950', category: 'deep_work' };

  $: curMonth = $calendarStore.currentMonth;
  $: selDate = $calendarStore.selectedDate;
  $: view = $calendarStore.view;

  $: monthStart = startOfMonth(curMonth);
  $: monthEnd = endOfMonth(curMonth);
  $: days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  $: startPad = getDay(monthStart); // 0=Sun

  $: eventsForDate = $calendarStore.events.filter(e =>
    isSameDay(new Date(e.start_dt), selDate)
  );
  $: blocksForDate = $calendarStore.timeBlocks.filter(b =>
    isSameDay(new Date(b.start_dt), selDate)
  );

  function prevMonth() {
    currentMonth.update(m => subMonths(m, 1));
  }
  function nextMonth() {
    currentMonth.update(m => addMonths(m, 1));
  }
  function selectDay(d: Date) { setSelectedDate(d); }
  function hasEvents(d: Date): boolean {
    return $calendarStore.events.some(e => isSameDay(new Date(e.start_dt), d));
  }

  function openNewEvent() {
    editingEvent = null;
    const dateStr = format(selDate, "yyyy-MM-dd'T'HH:mm");
    eventForm = { title: '', description: '', start: dateStr, end: dateStr, color: '#58a6ff', all_day: false };
    showEventModal = true;
  }
  function openEditEvent(ev: CalendarEvent) {
    editingEvent = ev;
    eventForm = {
      title: ev.title,
      description: ev.description || '',
      start: ev.start_dt.slice(0, 16),
      end: ev.end_dt ? ev.end_dt.slice(0, 16) : '',
      color: ev.color || '#58a6ff',
      all_day: ev.all_day,
    };
    showEventModal = true;
  }
  async function saveEvent() {
    if (!eventForm.title.trim()) return;
    if (editingEvent) {
      await updateEvent(editingEvent.id, { title: eventForm.title, description: eventForm.description, start_dt: eventForm.start, end_dt: eventForm.end || null, color: eventForm.color, all_day: eventForm.all_day });
    } else {
      await addEvent({ title: eventForm.title, description: eventForm.description, start_dt: eventForm.start, end_dt: eventForm.end || null, color: eventForm.color, all_day: eventForm.all_day, recurrence: null, external_id: null });
    }
    showEventModal = false;
  }
  async function removeEvent(id: string) { await deleteEvent(id); }

  function openNewBlock() {
    const dateStr = format(selDate, "yyyy-MM-dd'T'HH:mm");
    blockForm = { title: '', start: dateStr, end: dateStr, color: '#3fb950', category: 'deep_work' };
    showBlockModal = true;
  }
  async function saveBlock() {
    if (!blockForm.title.trim()) return;
    await addTimeBlock({ title: blockForm.title, start_dt: blockForm.start, end_dt: blockForm.end, color: blockForm.color, category: blockForm.category, todo_id: null });
    showBlockModal = false;
  }
  async function removeBlock(id: string) { await deleteTimeBlock(id); }

  const hours = Array.from({ length: 24 }, (_, i) => i);
</script>

<div class="calendar-view">
  <div class="calendar-top">
    <div class="month-nav">
      <button class="btn-ghost" on:click={prevMonth}>◀</button>
      <h2 class="month-label">{format(curMonth, 'MMMM yyyy')}</h2>
      <button class="btn-ghost" on:click={nextMonth}>▶</button>
    </div>
    <div class="view-toggle">
      {#each (['month', 'week', 'day'] as const) as v}
        <button class="view-btn" class:active={view === v} on:click={() => setCalendarView(v)}>{v}</button>
      {/each}
    </div>
  </div>

  <div class="calendar-body">
    <!-- Month grid -->
    <div class="month-grid">
      <div class="day-headers">
        {#each ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as d}
          <span class="day-header">{d}</span>
        {/each}
      </div>
      <div class="day-grid">
        {#each Array(startPad) as _}
          <div class="day-cell empty"></div>
        {/each}
        {#each days as day}
          <button
            class="day-cell"
            class:today={isToday(day)}
            class:selected={isSameDay(day, selDate)}
            class:has-events={hasEvents(day)}
            on:click={() => selectDay(day)}
          >
            <span class="day-num">{format(day, 'd')}</span>
            {#if hasEvents(day)}<span class="event-dot"></span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Day detail -->
    <div class="day-detail">
      <div class="detail-header">
        <h3>{format(selDate, 'EEEE, MMM d')}</h3>
        <div class="detail-actions">
          <button class="btn-sm" on:click={openNewEvent}>+ Event</button>
          <button class="btn-sm btn-outline" on:click={openNewBlock}>+ Block</button>
        </div>
      </div>

      {#if eventsForDate.length > 0}
        <div class="section">
          <h4>Events</h4>
          {#each eventsForDate as ev}
            <div class="event-row" style="border-left: 3px solid {ev.color || 'var(--accent)'}">
              <div class="event-info">
                <span class="event-title">{ev.title}</span>
                <span class="event-time text-xs text-muted">
                  {ev.all_day ? 'All day' : format(new Date(ev.start_dt), 'HH:mm')}
                </span>
              </div>
              <div class="event-actions">
                <button class="btn-icon" on:click={() => openEditEvent(ev)}>✏️</button>
                <button class="btn-icon" on:click={() => removeEvent(ev.id)}>🗑️</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if blocksForDate.length > 0}
        <div class="section">
          <h4>Time Blocks</h4>
          {#each blocksForDate as block}
            <div class="block-row" style="border-left: 3px solid {block.color || 'var(--success)'}">
              <div class="block-info">
                <span class="block-label">{block.title}</span>
                <span class="block-time text-xs text-muted">
                  {format(new Date(block.start_dt), 'HH:mm')} – {format(new Date(block.end_dt), 'HH:mm')}
                </span>
              </div>
              <button class="btn-icon" on:click={() => removeBlock(block.id)}>🗑️</button>
            </div>
          {/each}
        </div>
      {/if}

      {#if eventsForDate.length === 0 && blocksForDate.length === 0}
        <p class="text-muted empty-detail">No events or time blocks for this day.</p>
      {/if}

      <!-- Day timeline -->
      <div class="timeline">
        {#each hours as h}
          <div class="timeline-row">
            <span class="timeline-hour text-xs text-muted">{String(h).padStart(2, '0')}:00</span>
            <div class="timeline-slot"></div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- Event Modal -->
{#if showEventModal}
  <div class="modal-overlay" role="button" tabindex="0" on:click={() => showEventModal = false} on:keydown={(e) => e.key === 'Escape' && (showEventModal = false)}>
    <div class="modal" role="dialog" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
      <h3>{editingEvent ? 'Edit Event' : 'New Event'}</h3>
      <label>Title<input bind:value={eventForm.title} placeholder="Event title" /></label>
      <label>Description<textarea bind:value={eventForm.description} rows="2" placeholder="Optional"></textarea></label>
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={eventForm.all_day} /> All day
      </label>
      <label>Start<input type="datetime-local" bind:value={eventForm.start} /></label>
      <label>End<input type="datetime-local" bind:value={eventForm.end} /></label>
      <label>Color<input type="color" bind:value={eventForm.color} /></label>
      <div class="modal-actions">
        <button class="btn-ghost" on:click={() => showEventModal = false}>Cancel</button>
        <button class="btn-sm" on:click={saveEvent}>Save</button>
      </div>
    </div>
  </div>
{/if}

<!-- Block Modal -->
{#if showBlockModal}
  <div class="modal-overlay" role="button" tabindex="0" on:click={() => showBlockModal = false} on:keydown={(e) => e.key === 'Escape' && (showBlockModal = false)}>
    <div class="modal" role="dialog" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
      <h3>New Time Block</h3>
      <label>Label<input bind:value={blockForm.title} placeholder="Deep work, meeting..." /></label>
      <label>Category
        <select bind:value={blockForm.category}>
          <option value="deep_work">🎯 Deep Work</option>
          <option value="shallow_work">📋 Shallow Work</option>
          <option value="meeting">👥 Meeting</option>
          <option value="break">☕ Break</option>
          <option value="personal">🏠 Personal</option>
        </select>
      </label>
      <label>Start<input type="datetime-local" bind:value={blockForm.start} /></label>
      <label>End<input type="datetime-local" bind:value={blockForm.end} /></label>
      <label>Color<input type="color" bind:value={blockForm.color} /></label>
      <div class="modal-actions">
        <button class="btn-ghost" on:click={() => showBlockModal = false}>Cancel</button>
        <button class="btn-sm" on:click={saveBlock}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .calendar-view { flex: 1; padding: 20px; display: flex; flex-direction: column; overflow: hidden; }
  .calendar-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .month-nav { display: flex; align-items: center; gap: 12px; }
  .month-label { font-size: 18px; font-weight: 700; min-width: 200px; text-align: center; }
  .view-toggle { display: flex; gap: 4px; background: var(--panel-bg); border-radius: var(--radius-md); padding: 3px; }
  .view-btn { padding: 4px 12px; border: none; background: none; border-radius: var(--radius-sm); cursor: pointer; color: var(--text-muted); font-size: 12px; text-transform: capitalize; }
  .view-btn.active { background: var(--accent); color: var(--bg-primary); font-weight: 600; }

  .calendar-body { flex: 1; display: flex; gap: 16px; min-height: 0; }
  .month-grid { width: 340px; flex-shrink: 0; }
  .day-headers { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 4px; }
  .day-header { font-size: 11px; color: var(--text-muted); font-weight: 600; }
  .day-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .day-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: var(--radius-sm); cursor: pointer; background: none; color: var(--text-primary); font-size: 13px; position: relative; }
  .day-cell:hover { background: var(--hover-bg); }
  .day-cell.empty { cursor: default; }
  .day-cell.today { border-color: var(--accent); font-weight: 700; }
  .day-cell.selected { background: var(--accent); color: var(--bg-primary); }
  .event-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); position: absolute; bottom: 4px; }
  .day-cell.selected .event-dot { background: var(--bg-primary); }

  .day-detail { flex: 1; overflow-y: auto; border-left: 1px solid var(--border-color); padding-left: 16px; }
  .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .detail-header h3 { font-size: 16px; font-weight: 600; }
  .detail-actions { display: flex; gap: 6px; }

  .section { margin-bottom: 16px; }
  .section h4 { font-size: 12px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; letter-spacing: 0.5px; }

  .event-row, .block-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 10px; background: var(--card-bg); border-radius: var(--radius-sm); margin-bottom: 4px;
  }
  .event-info, .block-info { display: flex; flex-direction: column; gap: 2px; }
  .event-title, .block-label { font-size: 13px; font-weight: 500; }
  .event-actions { display: flex; gap: 4px; }

  .empty-detail { padding: 20px; text-align: center; font-style: italic; }

  .timeline { margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 8px; }
  .timeline-row { display: flex; align-items: flex-start; min-height: 28px; }
  .timeline-hour { width: 44px; flex-shrink: 0; text-align: right; padding-right: 8px; }
  .timeline-slot { flex: 1; border-bottom: 1px solid var(--border-color); min-height: 28px; }

  /* Modals */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
  .modal { background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; width: 380px; display: flex; flex-direction: column; gap: 12px; }
  .modal h3 { font-size: 16px; font-weight: 600; }
  .modal label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-secondary); }
  .modal input, .modal textarea, .modal select { padding: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--input-bg); color: var(--text-primary); font-size: 13px; }
  .modal input[type="color"] { height: 32px; padding: 2px; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  .checkbox-label { flex-direction: row !important; align-items: center; gap: 8px !important; }
  .checkbox-label input { width: auto; }

  .btn-sm { padding: 4px 12px; background: var(--accent); color: var(--bg-primary); border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; font-weight: 600; }
  .btn-outline { background: none; border: 1px solid var(--border-color); color: var(--text-primary); }
  .btn-ghost { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px; padding: 4px 8px; }
  .btn-icon { background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px; }
</style>
