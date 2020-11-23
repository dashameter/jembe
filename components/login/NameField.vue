<template>
  <div>
    <v-text-field
      v-model="name"
      class="mx-auto"
      style="
        font-size: 1.6rem;
        font-weight: 700;
        padding-top: 0.5em;
        padding-bottom: 0.5em;
      "
      outlined
      label="Enter Username"
      :value="this.$store.state.name.label"
      :disabled="this.$store.state.isSyncing"
      :rules="nameRules"
      :error-messages="nameErrors"
      :success-messages="nameSuccess"
      :messages="nameMessages"
      @keyup="validateName($event)"
      @input="validateName($event)"
    />
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
      label="Login PIN"
      :rules="loginPinRules"
      @keyup.enter="onboard()"
    />
  </div>
</template>

<script>
import { mapActions, mapMutations } from 'vuex'

export default {
  components: {},
  data() {
    return {
      name: '',
      onboardType: 'signup',
      // onboardType: 'create',
      onboardText: {
        // create: 'Create a Dash Account',
        login: 'Log In',
        signup: 'Sign Up',
      },

      nameExists: false,
      nameErrors: [],
      nameSuccess: [],
      nameMessages: [],
      loginPinRules: [
        (v) => !!v || 'Enter the Login PIN shown in your wallet.',
        (v) => /^\d{6}$/.test(v) || 'Please enter a 6 digit number.',
      ],
      nameRules: [
        (v) => !!v || "Let's start with who you are..",
        (v) => (!!v && v.length < 64) || 'Name can be max 63 characters.',
        (v) =>
          /^((?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])$/.test(v) ||
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
  created() {
    this.name = this.$store.state.name.label
  },
  methods: {
    ...mapActions([
      'dashNameExists',
      'registerNameOnceBalance',
      'isSignedUp',
      'signupRequest',
      'delegatedCredentialsRequest',
      'onboard',
    ]),
    ...mapMutations([
      'setName',
      'setNameValid',
      'setUidPin',
      'setUserId',
      'setUserIdentityId',
      'setOnboardText',
      'setOnboardType',
    ]),
    validateName(event) {
      this.nameErrors = []
      this.nameSuccess = []
      this.nameMessages = []

      // Save v-model value in store.state
      // TODO replace with get / set
      this.setName(this.name)

      // Set name invalid until proven valid
      this.setNameValid(false)
      this.nameExists = false

      // Clear old timeouts so we don't hit dapi with stale requests
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }

      // Debounce typing input
      this.timer = setTimeout(() => {
        if (
          this.name &&
          /^((?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])$/.test(this.name) &&
          this.name.length < 64
        )
          this.checkIfNameExists(this.name, event)
      }, 300)
    },
    async checkIfNameExists(searchName, event) {
      this.$store.commit('setOnboardText', this.onboardText[this.onboardType])
      console.log('Checking if name is taken: ', searchName)
      // Did the user change the name since the last debounce interval? Then return early..
      if (this.name !== searchName) return

      // Hit dapi to check if dpns name exists
      this.nameMessages = ['Checking if name is registered..']
      const nameExists = await this.dashNameExists(searchName)

      console.log('nameExists :>> ', nameExists)
      // Did the user change the name since hitting dapi? Return early..
      if (this.name !== searchName) return

      // Name exists or it doesn't :-)
      if (!nameExists) {
        this.nameErrors = [
          `${searchName} does not exist, double check your spelling..`,
        ]
        this.nameSuccess = []
        this.setNameValid(false)
        this.nameExists = false
        this.setName(this.name)
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
        this.nameSuccess = [
          `${searchName} exists, ready to ${
            this.onboardText[this.onboardType]
          }`,
        ]
        this.setNameValid(true)
        this.nameExists = true
        this.setName(this.name)
        if (event.keyCode === 13) this.onboard()
      }
    },
  },
}
</script>
