<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
import { useNetwork } from '../composables/useNetwork.js'
import { useTheme } from '../composables/useTheme.js'
import { useLocale } from '../composables/useLocale.js'

const {
  peerId, localName, isHost, isReady,
  players, error, sessionEnded,
  initHost, joinGame, changeName, startGame, leaveSession, reset,
} = useNetwork()

const { theme, cycleTheme } = useTheme()
const { locale, setLocale, SUPPORTED } = useLocale()
const { t } = useI18n()

const themeIcon = computed(() => ({ system: 'pi pi-desktop', light: 'pi pi-sun', dark: 'pi pi-moon' }[theme.value]))
const themeTitle = computed(() => ({ system: t('theme.system'), light: t('theme.light'), dark: t('theme.dark') }[theme.value]))

const nameInput   = ref('')
const joinId      = ref('')
const copied      = ref(false)
const editingName = ref(false)
const editDraft   = ref('')

const hasName = computed(() => nameInput.value.trim().length > 0)

function handleHost() {
  if (hasName.value) initHost(nameInput.value.trim())
}

function handleJoin() {
  if (hasName.value && joinId.value.trim().length >= 6) {
    joinGame(joinId.value, nameInput.value.trim())
  }
}

async function copyCode() {
  await navigator.clipboard.writeText(peerId.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function openEdit() {
  editDraft.value = localName.value
  editingName.value = true
}

function saveEdit() {
  const name = editDraft.value.trim()
  if (name) changeName(name)
  editingName.value = false
}
</script>

<template>
  <div class="min-h-screen bg-page flex flex-col transition-colors duration-200">

    <!-- Header bar -->
    <header class="flex items-center justify-between px-6 py-3 bg-surface border-b border-border shadow-sm">
      <div class="flex items-center gap-3">
        <span class="bg-blue-700 text-white text-xs font-bold tracking-widest px-2.5 py-1 rounded">404</span>
        <h1 class="text-base font-semibold text-ink m-0">Trust Not Found</h1>
      </div>
      <div class="flex items-center gap-2">
        <!-- Language toggle -->
        <div class="w-10 h-10 rounded-xl bg-surface border border-border text-ink-dim shadow-sm hover:bg-raised transition-colors flex items-center justify-center relative">
          <span class="text-xs font-bold uppercase pointer-events-none select-none">{{ locale }}</span>
          <select
            :value="locale"
            @change="setLocale($event.target.value)"
            class="absolute inset-0 opacity-0 cursor-pointer w-full"
            aria-label="Language"
          >
            <option v-for="lang in SUPPORTED" :key="lang" :value="lang">{{ lang.toUpperCase() }}</option>
          </select>
        </div>

        <!-- Theme toggle -->
        <button
          @click="cycleTheme"
          class="w-10 h-10 rounded-xl bg-surface border border-border text-ink-dim shadow-sm hover:bg-raised transition-colors flex items-center justify-center cursor-pointer"
          :title="themeTitle"
        >
          <i :class="themeIcon" class="text-base" />
        </button>
      </div>
    </header>

    <div class="flex flex-col items-center px-6 py-12 gap-10 flex-1">

    <!-- ── Pre-game ─────────────────────────────────────── -->
    <div v-if="!isReady" class="flex flex-col items-center gap-5 w-full max-w-2xl">

      <!-- Step 1: Name -->
      <div class="w-full bg-surface border border-border rounded-2xl shadow-sm px-8 py-6">
        <div class="flex items-center gap-3 mb-1">
          <span
            class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            :class="hasName ? 'bg-blue-700 text-white' : 'bg-muted-bg text-muted-text'"
          >
            {{ hasName ? '✓' : '1' }}
          </span>
          <label for="player-name" class="text-sm font-semibold text-ink-sub uppercase tracking-wider">
            {{ t('pregame.yourName') }}
          </label>
        </div>
        <InputText
          id="player-name"
          v-model="nameInput"
          :placeholder="t('pregame.namePlaceholder')"
          maxlength="24"
          class="w-full mt-2"
          size="large"
        />
      </div>

      <!-- Step 2: Host / Join -->
      <div
        class="w-full bg-surface border border-border rounded-2xl shadow-sm overflow-hidden transition-opacity duration-200"
        :class="hasName ? 'opacity-100' : 'opacity-50 pointer-events-none select-none'"
      >
        <div class="flex flex-col sm:flex-row items-stretch">
          <!-- Host -->
          <div class="flex-1 px-8 py-7 flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-muted-bg text-muted-text flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <h2 class="text-lg font-semibold text-ink-sub m-0">{{ t('pregame.hostTitle') }}</h2>
            </div>
            <p class="text-sm text-ink-dim leading-relaxed m-0">
              {{ t('pregame.hostDesc') }}
            </p>
            <Button :label="t('pregame.hostBtn')" class="mt-auto self-start" @click="handleHost" />
          </div>

          <div class="sm:hidden"><Divider layout="horizontal" class="!my-0" /></div>
          <div class="hidden sm:flex"><Divider layout="vertical" class="!mx-0" /></div>

          <!-- Join -->
          <div class="flex-1 px-8 py-7 flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-muted-bg text-muted-text flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <h2 class="text-lg font-semibold text-ink-sub m-0">{{ t('pregame.joinTitle') }}</h2>
            </div>
            <p class="text-sm text-ink-dim leading-relaxed m-0">
              {{ t('pregame.joinDesc') }}
            </p>
            <div class="flex items-center gap-2 mt-auto">
              <InputText
                v-model="joinId"
                :placeholder="t('pregame.joinPlaceholder')"
                maxlength="6"
                class="w-32 font-mono tracking-widest uppercase"
                @keyup.enter="handleJoin"
              />
              <Button
                :label="t('pregame.joinBtn')"
                :disabled="joinId.trim().length < 6"
                @click="handleJoin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Lobby ───────────────────────────────────────── -->
    <div v-else class="flex flex-col gap-5 w-full max-w-lg">

      <!-- Room info -->
      <div class="bg-surface border border-border rounded-2xl shadow-sm p-7 flex flex-col gap-5">

        <div class="flex items-center gap-2 text-sm font-medium text-ink-dim">
          <span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)] shrink-0"></span>
          {{ isHost ? t('lobby.statusHosting') : t('lobby.statusConnected') }}
        </div>

        <!-- Room code (host only) -->
        <div v-if="isHost" class="flex flex-col gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-faint">{{ t('lobby.roomCode') }}</span>
          <div class="flex items-center gap-3">
            <code class="flex-1 font-mono text-2xl font-semibold tracking-[0.25em] bg-raised border border-border rounded-lg px-4 py-2.5 text-ink">
              {{ peerId }}
            </code>
            <Button
              :label="copied ? t('lobby.copied') : t('lobby.copy')"
              :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
              severity="secondary"
              size="small"
              @click="copyCode"
            />
          </div>
          <p class="text-xs text-ink-faint m-0">{{ t('lobby.shareHint') }}</p>
        </div>

        <!-- Editable display name -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-faint">{{ t('lobby.yourName') }}</span>
          <div v-if="!editingName" class="flex items-center gap-3">
            <span class="text-base font-medium text-ink-sub flex-1">{{ localName }}</span>
            <Button :label="t('lobby.edit')" icon="pi pi-pencil" severity="secondary" size="small" @click="openEdit" />
          </div>
          <div v-else class="flex items-center gap-2">
            <InputText v-model="editDraft" maxlength="24" class="flex-1" @keyup.enter="saveEdit" @keyup.esc="editingName = false" />
            <Button :label="t('lobby.save')" size="small" @click="saveEdit" />
            <Button :label="t('lobby.cancel')" severity="secondary" size="small" @click="editingName = false" />
          </div>
        </div>
      </div>

      <!-- Player list -->
      <div class="bg-surface border border-border rounded-2xl shadow-sm p-7">
        <h3 class="flex items-center gap-2 text-sm font-semibold text-ink-sub m-0 mb-4">
          {{ t('lobby.players') }}
          <span class="w-5 h-5 rounded-full bg-chip-bg text-chip-text text-xs font-bold flex items-center justify-center">
            {{ players.length }}
          </span>
          <span class="text-xs text-ink-faint font-normal ml-auto">
            {{ t('lobby.playerCount', { count: players.length }) }}
          </span>
        </h3>
        <ul class="flex flex-col gap-2 m-0 p-0 list-none">
          <li
            v-for="player in players"
            :key="player.id"
            class="flex items-center gap-3 bg-raised border border-border-sub rounded-xl px-4 py-2.5"
          >
            <span class="w-8 h-8 rounded-lg bg-chip-bg text-chip-text font-bold text-sm flex items-center justify-center shrink-0">
              {{ player.name.charAt(0).toUpperCase() }}
            </span>
            <span class="text-sm font-medium text-ink-sub flex-1">{{ player.name }}</span>
            <span
              v-if="player.id === peerId"
              class="text-xs font-semibold uppercase tracking-wide text-chip-text bg-chip-bg px-2 py-0.5 rounded"
            >
              {{ t('lobby.you') }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Action row -->
      <div class="flex items-center justify-between gap-3">
        <Button :label="t('lobby.leaveSession')" icon="pi pi-sign-out" severity="danger" outlined @click="leaveSession" />
        <div v-if="isHost" class="flex flex-col items-end gap-1">
          <span
            v-if="players.length >= 10"
            class="text-xs font-semibold text-danger-text bg-danger-surface border border-danger-border px-2.5 py-1 rounded-lg"
          >
            {{ t('lobby.lobbyFull') }}
          </span>
          <Button
            :label="t('lobby.startGame')"
            icon="pi pi-play"
            :disabled="players.length < 3"
            @click="startGame"
          />
          <span v-if="players.length < 3" class="text-xs text-ink-faint">
            {{ t('lobby.startGameHint') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-danger-surface border border-danger-border text-danger-text rounded-xl px-4 py-3 text-sm max-w-lg w-full">
      <strong>{{ t('modal.errorLabel') }}</strong> {{ error }}
    </div>

    <!-- Session ended modal -->
    <Dialog v-model:visible="sessionEnded" modal :header="t('modal.sessionEndedTitle')" :closable="false" class="w-96">
      <div class="flex flex-col items-center gap-4 py-4 text-center">
        <span class="text-5xl">🔌</span>
        <p class="text-ink-dim text-sm m-0">{{ t('modal.sessionEndedMsg') }}</p>
      </div>
      <template #footer>
        <Button :label="t('modal.backToLobby')" icon="pi pi-home" fluid @click="reset" />
      </template>
    </Dialog>

    </div><!-- end inner content -->
  </div>
</template>
