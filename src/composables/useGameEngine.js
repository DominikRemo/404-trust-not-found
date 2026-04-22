import { ref, readonly } from 'vue'

// ── Fisher-Yates shuffle ──────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Distribution tables ───────────────────────────────────────────────────────
const ROLE_POOLS = {
  3:  { goodDev: 2, badDev: 2 },
  4:  { goodDev: 3, badDev: 2 },
  5:  { goodDev: 3, badDev: 2 },
  6:  { goodDev: 4, badDev: 2 },
  7:  { goodDev: 5, badDev: 3 },
  8:  { goodDev: 6, badDev: 3 },
  9:  { goodDev: 6, badDev: 3 },
  10: { goodDev: 7, badDev: 4 },
}

const DECK_POOLS = {
  3:  { feature: 5,  bug: 2, chore: 8  },
  4:  { feature: 6,  bug: 2, chore: 12 },
  5:  { feature: 7,  bug: 2, chore: 16 },
  6:  { feature: 8,  bug: 2, chore: 20 },
  7:  { feature: 7,  bug: 2, chore: 26 },
  8:  { feature: 8,  bug: 2, chore: 30 },
  9:  { feature: 9,  bug: 2, chore: 34 },
  10: { feature: 10, bug: 3, chore: 37 },
}

// Cards dealt to each player at the start of each sprint
const SPRINT_HAND_SIZES = { 1: 5, 2: 4, 3: 3, 4: 2 }

// ── Singleton state (module-scope) ────────────────────────────────────────────
const players        = ref([])   // [{ id, name }]
const roles          = ref({})   // { [playerId]: 'goodDev' | 'badDev' } — never expose to UI
const hands          = ref({})   // { [playerId]: Card[] }
const mainRepo       = ref([])   // Card[] with added `sprint` field
const currentSprint  = ref(1)
const sprintTurns    = ref(0)    // merged PRs in the current sprint
const activeReviewer = ref('')   // player ID whose turn it is
const gameState      = ref('lobby') // 'lobby' | 'viewing' | 'playing' | 'goodDevsWin' | 'badDevsWin' | 'deadlineMissed'
const totalFeatures  = ref(0)    // total features in the deck for this game
const totalBugs      = ref(0)    // total bugs in the deck for this game
const readyPlayers   = ref([])   // player IDs who clicked "Put Down Cards"

// ── Internal helpers ──────────────────────────────────────────────────────────
function dealCurrentSprint() {
  gameState.value    = 'viewing'
  readyPlayers.value = []

  const cardsPerPlayer = SPRINT_HAND_SIZES[currentSprint.value]
  const unmerged = shuffle(Object.values(hands.value).flat())

  const newHands = {}
  players.value.forEach((p, i) => {
    newHands[p.id] = unmerged.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer)
  })
  hands.value = newHands
}

function checkWinConditions() {
  const mergedFeatures = mainRepo.value.filter(c => c.type === 'feature').length
  const mergedBugs     = mainRepo.value.filter(c => c.type === 'bug').length

  if (mergedFeatures === totalFeatures.value) {
    gameState.value = 'goodDevsWin'
    return true
  }
  if (mergedBugs === totalBugs.value) {
    gameState.value = 'badDevsWin'
    return true
  }
  return false
}

// ── Exported composable ───────────────────────────────────────────────────────
export function useGameEngine() {
  /**
   * Initialise a new game for the given player list.
   * playerList: [{ id: string, name: string }]
   */
  function setupGame(playerList) {
    const n = playerList.length
    if (!DECK_POOLS[n]) throw new Error(`Invalid player count: ${n}`)

    const dp = DECK_POOLS[n]
    const rp = ROLE_POOLS[n]

    // Build full deck
    let seq = 0
    const fullDeck = [
      ...Array(dp.feature).fill(null).map(() => ({ id: `c${seq++}`, type: 'feature' })),
      ...Array(dp.bug).fill(null).map(()     => ({ id: `c${seq++}`, type: 'bug'     })),
      ...Array(dp.chore).fill(null).map(()   => ({ id: `c${seq++}`, type: 'chore'   })),
    ]

    // Shuffle role pool, deal one per player, discard the rest silently
    const roleList = shuffle([
      ...Array(rp.goodDev).fill('goodDev'),
      ...Array(rp.badDev).fill('badDev'),
    ])
    const rolesMap = {}
    playerList.forEach((p, i) => { rolesMap[p.id] = roleList[i] })

    // Initialise state
    players.value        = [...playerList]
    roles.value          = rolesMap
    mainRepo.value       = []
    currentSprint.value  = 1
    sprintTurns.value    = 0
    gameState.value      = 'viewing'
    readyPlayers.value   = []
    totalFeatures.value  = dp.feature
    totalBugs.value      = dp.bug

    // Pick a random starting reviewer
    activeReviewer.value = shuffle(playerList)[0].id

    // Deal Sprint 1 — all deck cards go into hands
    const shuffledDeck   = shuffle(fullDeck)
    const cardsPerPlayer = SPRINT_HAND_SIZES[1]
    const initialHands   = {}
    playerList.forEach((p, i) => {
      initialHands[p.id] = shuffledDeck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer)
    })
    hands.value = initialHands
  }

  /**
   * Mark a player as ready to start playing.
   * When all players are ready, shuffle each hand and transition to 'playing'.
   * The shuffle ensures card positions differ from what was memorised.
   */
  function markReady(playerId) {
    if (readyPlayers.value.includes(playerId)) return
    readyPlayers.value = [...readyPlayers.value, playerId]

    if (readyPlayers.value.length === players.value.length) {
      const shuffled = {}
      for (const [id, hand] of Object.entries(hands.value)) {
        shuffled[id] = shuffle([...hand])
      }
      hands.value    = shuffled
      gameState.value = 'playing'
    }
  }

  /**
   * Active reviewer merges one card from targetPlayer's hand.
   * targetPlayerId: the player whose card is being merged
   * cardIndex: index into that player's current hand array
   */
  function mergePR(targetPlayerId, cardIndex) {
    if (gameState.value !== 'playing') return
    if (targetPlayerId === activeReviewer.value) return // reviewers cannot merge their own PR

    const targetHand = hands.value[targetPlayerId]
    if (!targetHand || cardIndex < 0 || cardIndex >= targetHand.length) return

    // Move card to mainRepo
    const [card] = targetHand.splice(cardIndex, 1)
    mainRepo.value.push({ ...card, sprint: currentSprint.value })

    // The reviewed player becomes the next reviewer
    activeReviewer.value = targetPlayerId

    // Win conditions take priority over sprint advancement
    if (checkWinConditions()) return

    // Advance sprint turn counter
    sprintTurns.value++
    if (sprintTurns.value >= players.value.length) {
      // Sprint complete — check deadline before starting next
      if (currentSprint.value >= 4) {
        gameState.value = 'deadlineMissed'
        return
      }
      currentSprint.value++
      sprintTurns.value = 0
      dealCurrentSprint()
    }
  }

  /**
   * Serialize all state into a plain JSON-safe object for network transport.
   */
  function serializeState() {
    return {
      players:        players.value,
      roles:          roles.value,
      hands:          hands.value,
      mainRepo:       mainRepo.value,
      currentSprint:  currentSprint.value,
      sprintTurns:    sprintTurns.value,
      activeReviewer: activeReviewer.value,
      gameState:      gameState.value,
      totalFeatures:  totalFeatures.value,
      totalBugs:      totalBugs.value,
      readyPlayers:   readyPlayers.value,
    }
  }

  /**
   * Serialize state for a specific recipient — opponent hands are masked so
   * clients cannot read card types they shouldn't know.
   */
  function serializeStateFor(targetPlayerId) {
    const maskedHands = {}
    for (const [id, hand] of Object.entries(hands.value)) {
      maskedHands[id] = id === targetPlayerId
        ? hand
        : hand.map(card => ({ id: card.id, type: 'hidden' }))
    }
    return { ...serializeState(), hands: maskedHands }
  }

  /**
   * Apply a serialized snapshot received from the host.
   */
  function applyState(snapshot) {
    players.value        = snapshot.players
    roles.value          = snapshot.roles
    hands.value          = snapshot.hands
    mainRepo.value       = snapshot.mainRepo
    currentSprint.value  = snapshot.currentSprint
    sprintTurns.value    = snapshot.sprintTurns
    activeReviewer.value = snapshot.activeReviewer
    gameState.value      = snapshot.gameState
    totalFeatures.value  = snapshot.totalFeatures
    totalBugs.value      = snapshot.totalBugs
    readyPlayers.value   = snapshot.readyPlayers ?? []
  }

  /**
   * Reset all state back to lobby so a new game can be configured.
   */
  function resetGame() {
    players.value        = []
    roles.value          = {}
    hands.value          = {}
    mainRepo.value       = []
    currentSprint.value  = 1
    sprintTurns.value    = 0
    activeReviewer.value = ''
    gameState.value      = 'lobby'
    totalFeatures.value  = 0
    totalBugs.value      = 0
    readyPlayers.value   = []
  }

  return {
    // Reactive state (read-only outside this composable)
    players:        readonly(players),
    roles:          readonly(roles),
    hands:          readonly(hands),
    mainRepo:       readonly(mainRepo),
    currentSprint:  readonly(currentSprint),
    sprintTurns:    readonly(sprintTurns),
    activeReviewer: readonly(activeReviewer),
    gameState:      readonly(gameState),
    totalFeatures:  readonly(totalFeatures),
    totalBugs:      readonly(totalBugs),
    readyPlayers:   readonly(readyPlayers),
    // Actions
    setupGame,
    markReady,
    mergePR,
    resetGame,
    serializeState,
    serializeStateFor,
    applyState,
  }
}
