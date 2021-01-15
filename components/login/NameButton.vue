<template>
  <div style="width: 100%">
    <v-overlay absolute :value="isLoading">
      <span class="headline">
        Please finish {{ this.$store.state.onboardText }} in EvoWallet.
      </span>
    </v-overlay>
    <v-btn
      v-if="$store.state.onboardType !== 'createAccount'"
      style="width: 100%"
      large
      rounded
      elevation="0"
      class="mb-4 white--text"
      color="#008de4"
      :disabled="!this.$store.state.name.isValid"
      :loading="isLoading"
      @click="onboardMe()"
    >
      {{ this.$store.state.onboardText }}
    </v-btn>
    <v-btn
      v-if="$store.state.onboardType === 'createAccount'"
      style="width: 100%"
      large
      rounded
      elevation="0"
      class="mb-4 white--text"
      color="#008de4"
      :href="deeplink"
      target="_blank"
    >
      {{ this.$store.state.onboardText }}
    </v-btn>
    <span v-if="isLoading">
      {{ this.$store.getters.getLoadingStep }}
    </span>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default {
  components: {},
  data() {
    return {
      isLoading: false,
    }
  },
  computed: {
    ...mapGetters(['getTempIdentityId']),
    deeplink() {
      return `http://evowallet.io/#/?name=${this.$store.state.name.label}`
    },
  },
  methods: {
    ...mapActions(['registerNameOnceBalance', 'onboard']),
    async onboardMe() {
      this.isLoading = true
      if (this.getTempIdentityId) {
        await this.onboard()
        this.isLoading = false
      } else {
        await sleep(1000)
        this.onboardMe()
      }
    },
  },
}
</script>
