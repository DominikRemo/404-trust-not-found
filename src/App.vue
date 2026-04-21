<script setup>
import { useNetwork } from './composables/useNetwork.js'
import GameLobby from './components/GameLobby.vue'
import GameBoard from './components/GameBoard.vue'

const { gameStarted } = useNetwork()
</script>

<template>
  <GameBoard v-if="gameStarted" />
  <GameLobby v-else />
</template>
