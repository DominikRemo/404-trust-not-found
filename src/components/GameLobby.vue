<script setup>
import { ref } from 'vue'
import { useNetwork } from '../composables/useNetwork.js'
import './GameLobby.css'

const { peerId, isHost, isReady, connectedPeers, error, initHost, joinGame } = useNetwork()

const joinId = ref('')
const copied = ref(false)

function handleJoin() {
  if (joinId.value.trim()) {
    joinGame(joinId.value)
  }
}

async function copyId() {
  await navigator.clipboard.writeText(peerId.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="lobby">
    <header class="lobby-header">
      <div class="logo-badge">404</div>
      <h1>Trust Not Found</h1>
      <p class="subtitle">A social deduction game of trust, deception, and survival.</p>
    </header>

    <div v-if="!isReady" class="cards">
      <div class="card">
        <div class="card-icon">⚡</div>
        <h2>Host a Game</h2>
        <p>Create a new room and share the code with your friends.</p>
        <button class="btn btn-primary" @click="initHost">Host Game</button>
      </div>

      <div class="card-divider"></div>

      <div class="card">
        <div class="card-icon">🔗</div>
        <h2>Join a Game</h2>
        <p>Enter the room code from your host to connect.</p>
        <div class="input-row">
          <input
            v-model="joinId"
            class="input"
            placeholder="Enter room code…"
            @keyup.enter="handleJoin"
          />
          <button class="btn btn-primary" :disabled="!joinId.trim()" @click="handleJoin">
            Join
          </button>
        </div>
      </div>
    </div>

    <div v-else class="room">
      <div class="room-info">
        <div class="room-status">
          <span class="status-dot"></span>
          <span v-if="isHost">Hosting · Waiting for players</span>
          <span v-else>Connected to game</span>
        </div>

        <div v-if="isHost" class="room-code-block">
          <span class="room-code-label">Room Code</span>
          <div class="room-code-row">
            <code class="room-code">{{ peerId }}</code>
            <button class="btn btn-ghost" @click="copyId">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <p class="room-code-hint">Share this code with players who want to join.</p>
        </div>
      </div>

      <div class="player-list-section">
        <h3>Players <span class="player-count">{{ connectedPeers.length }}</span></h3>
        <ul class="player-list">
          <li
            v-for="(pid, i) in connectedPeers"
            :key="pid"
            class="player-item"
          >
            <span class="player-avatar">{{ String.fromCharCode(65 + i) }}</span>
            <span class="player-id">{{ pid === peerId ? `${pid} (you)` : pid }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      <strong>Error:</strong> {{ error }}
    </div>
  </div>
</template>
