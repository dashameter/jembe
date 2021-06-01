<template>
  <div style="width: 100%">
    <v-dialog v-model="isLoading" persistent max-width="400">
      <v-card>
        <v-card-title class="headline">
          Waiting for Dash Login ..
        </v-card-title>
        <v-card-text class="text-center">
          <v-progress-circular indeterminate />
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-btn
      style="width: 100%"
      large
      rounded
      elevation="0"
      class="mt-4 white--text"
      color="#008de4"
      :loading="isLoading"
      @click="loginWrapper()"
    >
      Login with Dash
    </v-btn>
    <span v-if="isLoading"> Connecting to Dash .. </span>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default {
  components: {},
  data() {
    return {
      isLoading: false,
    }
  },
  computed: {},
  methods: {
    ...mapActions(['login']),
    async loginWrapper() {
      this.isLoading = true

      await this.login()

      this.isLoading = false
    },
  },
}
</script>
