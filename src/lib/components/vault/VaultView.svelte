<script lang="ts">
  import {
    vaultUnlocked, vaultSecrets, filteredSecrets, vaultSearchQuery,
    hasVault, unlockVault, createVault, lockVault,
    addSecret, updateSecret, removeSecret
  } from '../../stores/vault';
  import type { VaultSecret } from '../../types';

  let password = '';
  let confirmPassword = '';
  let error = '';
  let showPassword = false;
  let isCreating = !hasVault();

  // Add/Edit modal state
  let showModal = false;
  let editingSecret: VaultSecret | null = null;
  let formName = '';
  let formCategory: VaultSecret['category'] = 'custom';
  let formValue = '';
  let formNotes = '';
  let showSecretValue: Record<string, boolean> = {};
  let copiedId = '';

  async function handleUnlock() {
    error = '';
    const success = await unlockVault(password);
    if (!success) error = 'Invalid password';
    password = '';
  }

  async function handleCreate() {
    error = '';
    if (password.length < 8) { error = 'Password must be at least 8 characters'; return; }
    if (password !== confirmPassword) { error = 'Passwords do not match'; return; }
    await createVault(password);
    password = '';
    confirmPassword = '';
  }

  function openAddModal() {
    editingSecret = null;
    formName = '';
    formCategory = 'custom';
    formValue = '';
    formNotes = '';
    showModal = true;
  }

  function openEditModal(secret: VaultSecret) {
    editingSecret = secret;
    formName = secret.name;
    formCategory = secret.category;
    formValue = secret.value;
    formNotes = secret.notes;
    showModal = true;
  }

  async function handleSave() {
    if (!formName.trim() || !formValue.trim()) return;
    if (editingSecret) {
      await updateSecret(editingSecret.id, {
        name: formName,
        category: formCategory,
        value: formValue,
        notes: formNotes,
      });
    } else {
      await addSecret({
        name: formName,
        category: formCategory,
        value: formValue,
        notes: formNotes,
      });
    }
    showModal = false;
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this secret permanently?')) {
      await removeSecret(id);
    }
  }

  async function copyToClipboard(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      copiedId = id;
      setTimeout(() => { copiedId = ''; }, 2000);
    } catch {}
  }

  const categoryIcons: Record<string, string> = {
    api_key: '🔑',
    password: '🔐',
    ssh_key: '🗝️',
    note: '📄',
    custom: '📦',
  };
</script>

<div class="vault-view">
  {#if !$vaultUnlocked}
    <!-- Lock Screen -->
    <div class="vault-lock-screen">
      <div class="lock-card">
        <span class="lock-icon">🔒</span>
        <h2>{isCreating ? 'Create Vault' : 'Unlock Vault'}</h2>
        <p class="text-muted">{isCreating ? 'Set a master password to encrypt your secrets' : 'Enter your master password'}</p>

        {#if error}
          <div class="error-msg">{error}</div>
        {/if}

        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Master password"
          bind:value={password}
          on:keydown={(e) => e.key === 'Enter' && (isCreating ? handleCreate() : handleUnlock())}
          class="vault-input"
        />

        {#if isCreating}
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            bind:value={confirmPassword}
            on:keydown={(e) => e.key === 'Enter' && handleCreate()}
            class="vault-input"
          />
        {/if}

        <label class="show-pass">
          <input type="checkbox" bind:checked={showPassword} /> Show password
        </label>

        <button class="vault-btn" on:click={isCreating ? handleCreate : handleUnlock}>
          {isCreating ? 'Create Vault' : 'Unlock'}
        </button>
      </div>
    </div>
  {:else}
    <!-- Unlocked Vault -->
    <div class="vault-header">
      <div class="vault-header-left">
        <h2>🔓 Secrets Vault</h2>
        <span class="text-xs text-muted">{$vaultSecrets.length} secrets stored</span>
      </div>
      <div class="vault-header-right">
        <input
          type="text"
          placeholder="Search secrets..."
          bind:value={$vaultSearchQuery}
          class="vault-search"
        />
        <button class="vault-btn small" on:click={openAddModal}>+ Add Secret</button>
        <button class="vault-btn small danger" on:click={lockVault}>🔒 Lock</button>
      </div>
    </div>

    <div class="secrets-list">
      {#each $filteredSecrets as secret (secret.id)}
        <div class="secret-card">
          <div class="secret-header">
            <span class="secret-icon">{categoryIcons[secret.category] || '📦'}</span>
            <span class="secret-name">{secret.name}</span>
            <span class="secret-category">{secret.category}</span>
          </div>
          <div class="secret-value">
            {#if showSecretValue[secret.id]}
              <code>{secret.value}</code>
            {:else}
              <code>{'•'.repeat(Math.min(secret.value.length, 24))}</code>
            {/if}
          </div>
          {#if secret.notes}
            <p class="secret-notes text-xs text-muted">{secret.notes}</p>
          {/if}
          <div class="secret-actions">
            <button on:click={() => showSecretValue[secret.id] = !showSecretValue[secret.id]}>
              {showSecretValue[secret.id] ? '👁️ Hide' : '👁️ Show'}
            </button>
            <button on:click={() => copyToClipboard(secret.value, secret.id)}>
              {copiedId === secret.id ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button on:click={() => openEditModal(secret)}>✏️ Edit</button>
            <button class="danger" on:click={() => handleDelete(secret.id)}>🗑️</button>
          </div>
        </div>
      {/each}

      {#if $filteredSecrets.length === 0}
        <div class="empty-vault">
          <span class="big-icon">🔐</span>
          <p>No secrets stored yet</p>
          <button class="vault-btn" on:click={openAddModal}>Add your first secret</button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Add/Edit Modal -->
  {#if showModal}
    <div class="modal-overlay" role="button" tabindex="0" on:click={() => showModal = false} on:keydown={(e) => e.key === 'Escape' && (showModal = false)}>
      <div class="modal" role="dialog" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
        <h3>{editingSecret ? 'Edit Secret' : 'Add Secret'}</h3>
        <div class="form-group">
          <label>Name<input type="text" bind:value={formName} placeholder="e.g., GitHub Token" /></label>
        </div>
        <div class="form-group">
          <label>Category<select bind:value={formCategory}>
            <option value="api_key">🔑 API Key</option>
            <option value="password">🔐 Password</option>
            <option value="ssh_key">🗝️ SSH Key</option>
            <option value="note">📄 Encrypted Note</option>
            <option value="custom">📦 Custom</option>
          </select></label>
        </div>
        <div class="form-group">
          <label>Value<textarea bind:value={formValue} placeholder="Secret value..." rows="4"></textarea></label>
        </div>
        <div class="form-group">
          <label>Notes (optional)<input type="text" bind:value={formNotes} placeholder="Additional notes..." /></label>
        </div>
        <div class="modal-actions">
          <button class="vault-btn small" on:click={() => showModal = false}>Cancel</button>
          <button class="vault-btn small accent" on:click={handleSave}>Save</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .vault-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  .vault-lock-screen {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lock-card {
    width: 360px;
    text-align: center;
    padding: 32px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    animation: slideUp 0.3s ease;
  }
  .lock-icon { font-size: 48px; display: block; margin-bottom: 16px; }
  .lock-card h2 { margin-bottom: 6px; }
  .lock-card p { margin-bottom: 20px; }

  .vault-input {
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 10px;
    font-size: 14px;
  }
  .show-pass {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 16px;
    cursor: pointer;
    justify-content: center;
  }
  .error-msg {
    background: var(--error);
    color: white;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    margin-bottom: 12px;
  }

  .vault-btn {
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    background: var(--accent-primary);
    color: var(--text-inverse);
    font-weight: 600;
    font-size: 14px;
    transition: opacity var(--transition-fast);
    width: 100%;
  }
  .vault-btn:hover { opacity: 0.85; }
  .vault-btn.small { width: auto; padding: 6px 12px; font-size: 12px; }
  .vault-btn.danger { background: var(--error); }
  .vault-btn.accent { background: var(--accent-primary); }

  .vault-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-primary);
  }
  .vault-header h2 { font-size: 18px; }
  .vault-header-right { display: flex; gap: 8px; align-items: center; }
  .vault-search { font-size: 12px; width: 200px; }

  .secrets-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .secret-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-md);
    padding: 12px 16px;
  }
  .secret-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .secret-name { font-weight: 600; flex: 1; }
  .secret-category {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 12px;
    background: var(--badge-bg);
    color: var(--badge-text);
    text-transform: uppercase;
  }
  .secret-value {
    margin-bottom: 6px;
  }
  .secret-value code {
    background: var(--bg-tertiary);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 12px;
    display: block;
    word-break: break-all;
  }
  .secret-notes { margin-bottom: 8px; }
  .secret-actions {
    display: flex;
    gap: 8px;
  }
  .secret-actions button {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }
  .secret-actions button:hover { background: var(--bg-hover); }
  .secret-actions button.danger:hover { color: var(--error); }

  .empty-vault {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-muted);
  }
  .big-icon { font-size: 48px; }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 24px;
    width: 420px;
    animation: slideUp 0.2s ease;
  }
  .modal h3 { margin-bottom: 16px; }
  .form-group { margin-bottom: 12px; }
  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--text-secondary);
  }
  .form-group input, .form-group select, .form-group textarea {
    width: 100%;
  }
  .form-group textarea { resize: vertical; }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
</style>
