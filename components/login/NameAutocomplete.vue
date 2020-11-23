<template>
  <div>
    <v-autocomplete
      :value="name"
      auto-select-first
      class="mx-auto"
      style="
        font-size: 1.6rem;
        font-weight: 700;
        padding-top: 0.5em;
        padding-bottom: 0.5em;
      "
      outlined
      label="Enter Username"
      :loading="loading"
      :items="items"
      :search-input.sync="search"
      hide-no-data
      :disabled="this.$store.state.isSyncing"
      :rules="nameRules"
      :error-messages="nameErrors"
      :success-messages="nameSuccess"
      :messages="nameMessages"
      @input="validateName($event)"
    ></v-autocomplete>
    <v-text-field
      v-if="nameExists"
      v-model="loginPin"
      style="
        font-size: 1.6rem;
        font-weight: 700;
        padding-top: 0.5em;
        padding-bottom: 0.5em;
      "
      outlined
      label="DAPP PIN"
      :rules="loginPinRules"
      @keyup.enter="onboard()"
    />
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapActions, mapMutations } from 'vuex'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default Vue.extend({
  data() {
    return {
      loading: false,
      items: [],
      search: null,
      searchDebounceTime: 0,
      searchDebounceNonce: 0,
      name: '',
      onboardType: 'signup',
      // onboardType: 'create',
      onboardText: {
        // create: 'Create a Dash Account',
        login: 'Log In',
        signup: 'Sign Up',
        createAccount: 'Create Account',
      },
      nameExists: false,
      nameErrors: [],
      nameSuccess: [],
      nameMessages: [],
      loginPinRules: [
        (v) => !!v || 'Enter the DAPP PIN shown in your wallet.',
        (v) => /^\d{6}$/.test(v) || 'Please enter a 6 digit number.',
      ],
      nameRules: [
        (v) => !!v || "Let's start with who you are..",
        (v) => (!!v && v.length < 64) || 'Name can be max 63 characters.',
        (v) =>
          /^((?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])$/.test(v.text) ||
          'Name can consists of A-Z,  0-9 and - within the name',
      ],
    }
  },
  computed: {
    loginPin: {
      get() {
        return this.$store.state.name.uidPin
      },
      set(value) {
        this.$store.commit('setUidPin', value)
      },
    },
  },
  watch: {
    async search(val) {
      const debounceMS = 200

      this.searchDebounceTime = Date.now() + debounceMS

      await sleep(debounceMS)

      const nonce = Date.now()

      // If a new search was started within debounceMS, do nothing
      if (this.searchDebounceTime <= nonce) {
        console.log('Name start search :>> ', val)
        console.log('current this.name :>> ', this.name)
        console.log('this.querySelections(val) :>> ', this.querySelections(val))
        const curVal = this.name ? this.name.split(':')[0] : null
        console.log('curVal :>> ', curVal)
        val && val !== curVal && (await this.querySelections(val, nonce))
      } else {
        console.log('search has been called within debounceMS')
        console.log('this.searchDebounceTime :>> ', this.searchDebounceTime)
      }
    },
  },
  methods: {
    ...mapMutations([
      'setName',
      'setNameValid',
      'setUidPin',
      'setUserId',
      'setUserIdentityId',
      'setOnboardText',
      'setOnboardType',
    ]),
    ...mapActions([
      'searchDashNames',
      'dashNameExists',
      'registerNameOnceBalance',
      'isSignedUp',
      'signupRequest',
      'sessionRequest',
      'onboard',
    ]),
    async querySelections(typedName, nonce) {
      if (!typedName) return

      // If a larger nonce was set since this function was called, this request is stale -> end function execution
      if (nonce < this.searchDebounceNonce) return

      this.searchDebounceNonce = nonce

      this.loading = true

      const dashNames = await this.searchDashNames(typedName)

      // If a larger nonce was set since the async search call, this request is stale -> end function execution
      if (nonce < this.searchDebounceNonce) return

      this.items = dashNames.map((name) => {
        return { text: name.data.label, value: `${name.data.label}:${name.id}` }
      })

      const normalizedLabels = dashNames.map((name) => {
        console.log(name.data)
        return name.data.normalizedLabel
      })

      const showCreateOption = !normalizedLabels.includes(
        typedName.toLowerCase()
      )

      if (showCreateOption) {
        this.items = [
          ...this.items,
          { header: `Create new Account`, text: typedName, value: typedName },
          { divider: true, text: typedName, value: typedName },
          { text: ` ${typedName}`, value: `${typedName}:newAccount` },
        ]
      }

      this.loading = false
    },
    validateName(event) {
      // Search Autocomplete Search is happening in the `watch -> ()` method

      // There is a bug in this vuetify component so instead of an object we use a ':' delimited string to hand over
      this.items = [{ text: event.split(':')[0], value: event }]
      console.log('event :>> ', event)
      console.log('event.split(:)[0]) :>> ', event.split(':')[0])
      this.name = event
      this.nameErrors = []
      this.nameSuccess = []
      this.nameMessages = []

      // Save v-model value in store.state
      // TODO replace with get / set
      console.log('this.name :>> ', this.name)
      this.setName(this.name.split(':')[0])

      // Set name invalid until proven valid
      this.setNameValid(false)
      this.nameExists = false

      // Clear old timeouts so we don't hit dapi with stale requests
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }

      // Debounce typing input
      // this.timer = setTimeout(() => {
      //   if (
      //     this.name.split(':')[0] &&
      //     /^((?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])$/.test(this.name) &&
      //     this.name.split(':')[0].length < 64
      //   )
      this.checkIfNameExists(this.name.split(':')[0], event)
      // }, 300)
    },
    async checkIfNameExists(searchName, event) {
      this.$store.commit('setOnboardText', this.onboardText[this.onboardType])
      console.log('Checking if name is taken: ', searchName)
      // Did the user change the name since the last debounce interval? Then return early..
      // if (this.name.split(':')[0] !== searchName) return

      // Hit dapi to check if dpns name exists
      this.nameMessages = ['Checking if this is your first time..']
      const nameExists = await this.dashNameExists(searchName)

      // console.log('nameExists :>> ', nameExists)
      // Did the user change the name since hitting dapi? Return early..
      // if (this.name.split(':')[0] !== searchName) return

      // Name exists or it doesn't :-)
      if (!nameExists) {
        // this.nameErrors = [
        //   `${searchName} does not exist, double check your spelling..`,
        // ]
        this.nameSuccess = [
          `Hi ${this.name.split(':')[0]}, let's create you a new Dash Account`,
        ]
        this.setNameValid(false)
        this.nameExists = false
        this.setName(this.name.split(':')[0])
        const win = window.open(
          `http://evowallet.io/#/?name=${this.name.split(':')[0]}`,
          '_blank'
        )
        win.focus()
        this.onboardType = 'createAccount'
        this.setOnboardText(this.onboardText[this.onboardType])
        this.setOnboardType(this.onboardType)
      } else {
        this.onboardType = 'signup'
        // this.$store.commit('setUserId', nameExists.$id)
        this.setUserId(nameExists.$id)
        this.setUserIdentityId(nameExists.$ownerId)
        // this.$store.commit('setOnboardText', this.onboardText[this.onboardType])
        this.setOnboardText(this.onboardText[this.onboardType])
        this.setOnboardType(this.onboardType)
        const nameIsSignedUp = await this.isSignedUp({ userId: nameExists.$id })
        console.log('nameIsSignedUp :>> ', nameIsSignedUp)
        if (nameIsSignedUp) {
          this.onboardType = 'login'
          // this.$store.commit(
          //   'setOnboardText',
          //   this.onboardText[this.onboardType]
          // )
          this.setOnboardText(this.onboardText[this.onboardType])
          this.setOnboardType(this.onboardType)
        }

        this.nameErrors = []
        if (this.onboardType === 'signup') {
          this.nameSuccess = [
            `This is your first time, ${searchName}. Please sign up.`,
          ]
        } else if (this.onboardType === 'login') {
          this.nameSuccess = [
            `Welcome back, ${searchName}! Go ahead and log in.`,
          ]
        }
        this.setNameValid(true)
        this.nameExists = true
        this.setName(this.name.split(':')[0])
        if (event.keyCode === 13) this.onboard()
      }
    },
  },
})
</script>
