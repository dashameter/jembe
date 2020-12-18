<template>
  <div style="width: 100%" class="pr-2">
    <v-autocomplete
      :value="name"
      auto-select-first
      flat
      hide-details=""
      rounded
      filled
      color="#008de4"
      dense
      full-width
      prepend-inner-icon="mdi-magnify"
      class="py-1"
      label="Search people to chat"
      :loading="loading"
      :items="items"
      :search-input.sync="search"
      hide-no-data
      :disabled="this.$store.state.isSyncing"
      :rules="nameRules"
      :success-messages="nameSuccess"
      :messages="nameMessages"
      @input="messageName($event)"
    ></v-autocomplete>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapActions, mapMutations } from 'vuex'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default Vue.extend({
  props: {
    chatPartnerUserName: { type: String, default: '' },
  },
  data() {
    return {
      loading: false,
      items: [],
      search: null,
      searchDebounceTime: 0,
      searchDebounceNonce: 0,
      name: '',
      nameExists: false,
      nameErrors: [],
      nameSuccess: [],
      nameMessages: [],
      nameRules: [
        (v) => v.length < 64 || 'Name can be max 63 characters.',
        (v) =>
          /^((?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])$/.test(v.text) ||
          'Name can consists of A-Z,  0-9 and - within the name',
      ],
    }
  },
  computed: {},
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
    ...mapMutations([]),
    ...mapActions([
      'searchJembeNames',
      // 'dashNameExists',
      // 'isSignedUp',
    ]),
    async querySelections(typedName, nonce) {
      if (!typedName) return

      // If a larger nonce was set since this function was called, this request is stale -> end function execution
      if (nonce < this.searchDebounceNonce) return

      this.searchDebounceNonce = nonce

      this.loading = true

      const dashNames = await this.searchJembeNames(typedName)

      // If a larger nonce was set since the async search call, this request is stale -> end function execution
      if (nonce < this.searchDebounceNonce) return

      this.items = dashNames.map((name) => {
        return {
          text: name.data.label,
          value: `${name.data.label}:${name.id}`,
        }
      })

      this.loading = false
    },
    messageName(event) {
      // Search Autocomplete Search is happening in the `watch -> ()` method
      // There is a bug in this vuetify component so instead of an object we use a ':' delimited string to hand over
      const userName = event.split(':')[0]
      this.items = [{ text: userName, value: event }]

      console.log('event :>> ', event)
      console.log('event.split(:)[0]) :>> ', event.split(':')[0])

      this.name = event
      this.nameErrors = []
      this.nameSuccess = []
      this.nameMessages = []

      console.log('messageName -> userName :>> ', userName)

      if (this.$route.name === 'messages-userName') {
        this.$router.push('/messages/' + userName)
      } else {
        this.$emit('chatpartnerselected', userName)
      }
    },
  },
})
</script>
