<script setup>
import { ref, computed } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
import { useNetwork } from '../composables/useNetwork.js'

const {
  peerId, localName, isHost, isReady,
  players, error, gameStarted, sessionEnded,
  initHost, joinGame, changeName, startGame, leaveSession, reset,
} = useNetwork()

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
  <div class="min-h-screen flex flex-col items-center px-6 py-12 gap-10">

    <!-- Header -->
    <header class="flex flex-col items-center gap-3 text-center">
      <span class="bg-blue-700 text-white text-xs font-bold tracking-widest px-3 py-1.5 rounded-md">
        404
      </span>
      <h1 class="text-4xl font-bold tracking-tight text-slate-900 m-0">Trust Not Found</h1>
      <p class="text-slate-500 text-base max-w-sm m-0">
        A social deduction game of trust, deception, and survival.
      </p>
    </header>

    <!-- ── Pre-game ─────────────────────────────────────── -->
    <div v-if="!isReady" class="flex flex-col items-center gap-5 w-full max-w-2xl">

      <!-- Step 1: Name -->
      <div class="w-full bg-white border border-slate-200 rounded-2xl shadow-sm px-8 py-6">
        <div class="flex items-center gap-3 mb-1">
          <span
            class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            :class="hasName ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'"
          >
            {{ hasName ? '✓' : '1' }}
          </span>
          <label for="player-name" class="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Your Name
          </label>
        </div>
        <InputText
          id="player-name"
          v-model="nameInput"
          placeholder="Enter your name…"
          maxlength="24"
          class="w-full mt-2"
          size="large"
        />
      </div>

      <!-- Step 2: Host / Join -->
      <div
        class="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-opacity duration-200"
        :class="hasName ? 'opacity-100' : 'opacity-50 pointer-events-none select-none'"
      >
        <div class="flex flex-col sm:flex-row items-stretch">
          <!-- Host -->
          <div class="flex-1 px-8 py-7 flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <h2 class="text-lg font-semibold text-slate-800 m-0">Host a Game</h2>
            </div>
            <p class="text-sm text-slate-500 leading-relaxed m-0">
              Create a new room and share the code with your friends.
            </p>
            <Button label="⚡ Host Game" class="mt-auto self-start" @click="handleHost" />
          </div>

          <div class="sm:hidden"><Divider layout="horizontal" class="!my-0" /></div>
          <div class="hidden sm:flex"><Divider layout="vertical" class="!mx-0" /></div>

          <!-- Join -->
          <div class="flex-1 px-8 py-7 flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <h2 class="text-lg font-semibold text-slate-800 m-0">Join a Game</h2>
            </div>
            <p class="text-sm text-slate-500 leading-relaxed m-0">
              Enter the room code from your host to connect.
            </p>
            <div class="flex items-center gap-2 mt-auto">
              <InputText
                v-model="joinId"
                placeholder="ABC123"
                maxlength="6"
                class="w-32 font-mono tracking-widest uppercase"
                @keyup.enter="handleJoin"
              />
              <Button
                label="🔗 Join"
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
      <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-7 flex flex-col gap-5">

        <div class="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)] shrink-0"></span>
          {{ isHost ? 'Hosting · Waiting for players' : 'Connected to game' }}
        </div>

        <!-- Room code (host only) -->
        <div v-if="isHost" class="flex flex-col gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Room Code</span>
          <div class="flex items-center gap-3">
            <code class="flex-1 font-mono text-2xl font-semibold tracking-[0.25em] bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900">
              {{ peerId }}
            </code>
            <Button
              :label="copied ? 'Copied!' : 'Copy'"
              :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
              severity="secondary"
              size="small"
              @click="copyCode"
            />
          </div>
          <p class="text-xs text-slate-400 m-0">Share this code with players who want to join.</p>
        </div>

        <!-- Editable display name -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Your Name</span>
          <div v-if="!editingName" class="flex items-center gap-3">
            <span class="text-base font-medium text-slate-800 flex-1">{{ localName }}</span>
            <Button label="Edit" icon="pi pi-pencil" severity="secondary" size="small" @click="openEdit" />
          </div>
          <div v-else class="flex items-center gap-2">
            <InputText v-model="editDraft" maxlength="24" class="flex-1" @keyup.enter="saveEdit" @keyup.esc="editingName = false" />
            <Button label="Save" size="small" @click="saveEdit" />
            <Button label="Cancel" severity="secondary" size="small" @click="editingName = false" />
          </div>
        </div>
      </div>

      <!-- Player list -->
      <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-7">
        <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-700 m-0 mb-4">
          Players
          <span class="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">
            {{ players.length }}
          </span>
        </h3>
        <ul class="flex flex-col gap-2 m-0 p-0 list-none">
          <li
            v-for="player in players"
            :key="player.id"
            class="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5"
          >
            <span class="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
              {{ player.name.charAt(0).toUpperCase() }}
            </span>
            <span class="text-sm font-medium text-slate-800 flex-1">{{ player.name }}</span>
            <span
              v-if="player.id === peerId"
              class="text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
            >
              you
            </span>
          </li>
        </ul>
      </div>

      <!-- Action row -->
      <div class="flex items-center justify-between gap-3">
        <Button label="Leave Session" icon="pi pi-sign-out" severity="danger" outlined @click="leaveSession" />
        <Button v-if="isHost" label="Start Game" icon="pi pi-play" @click="startGame" />
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm max-w-lg w-full">
      <strong>Error:</strong> {{ error }}
    </div>

    <!-- Game started modal -->
    <Dialog v-model:visible="gameStarted" modal header="Game is Starting!" :closable="false" class="w-96">
      <div class="flex flex-col items-center gap-4 py-4 text-center">
        <span class="text-5xl">🚀</span>
        <p class="text-slate-500 text-sm m-0">
          {{ isHost ? 'You started the game.' : 'The host has started the game.' }} Good luck!
        </p>
      </div>
      <template #footer>
        <Button label="Back to Lobby" icon="pi pi-home" fluid @click="reset" />
      </template>
    </Dialog>

    <!-- Session ended modal -->
    <Dialog v-model:visible="sessionEnded" modal header="Session Ended" :closable="false" class="w-96">
      <div class="flex flex-col items-center gap-4 py-4 text-center">
        <span class="text-5xl">🔌</span>
        <p class="text-slate-500 text-sm m-0">The host has closed this session.</p>
      </div>
      <template #footer>
        <Button label="Back to Lobby" icon="pi pi-home" fluid @click="reset" />
      </template>
    </Dialog>

  </div>
</template>
