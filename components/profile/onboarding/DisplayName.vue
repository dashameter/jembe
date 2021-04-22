<template>
  <div>
    <v-textarea
      v-model="newDisplayName"
      label="Display Name"
      rows="1"
      counter="20"
      :rules="rules"
    >
    </v-textarea>
    <v-card-actions>
      <v-spacer />
      <v-btn
        v-if="newDisplayName != profile.displayName"
        style="color: white"
        :loading="isSaving"
        :disabled="!isRuleValid"
        rounded
        color="#008de4"
        @click="saveDisplayName"
        >Save</v-btn
      >
      <v-spacer />
    </v-card-actions>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
// import crypto from '@dashevo/dashcore-lib'

export default {
  name: 'DisplayName',
  data() {
    return {
      profile: {},
      isSaving: false,
      newDisplayName: '',
      rules: [
        (value) => (value || '').length <= 20 || 'Max 20 characters',
        (value) => {
          const pattern = /^$|^[1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -]+$/
          return (
            pattern.test(value) ||
            'Name can consist of A-Z,  0-9 and - within the name'
          )
        },
      ],
    }
  },
  computed: {
    ...mapGetters(['getProfile']),
    isRuleValid() {
      const rulesResults = this.rules.map((fxn) => fxn(this.newDisplayName))
      return rulesResults.every((value) => value === true)
    },
  },
  created() {
    this.profile = this.getProfile(this.$store.state.name.label)
    this.newDisplayName = this.profile.displayName
  },
  methods: {
    ...mapActions(['submitDocument', 'fetchProfile', 'saveToDatastore']),
    async saveDisplayName() {
      this.isSaving = true
      console.log('this.profile :>> ', this.profile)
      const { avatarRaw, themeRaw } = this.profile
      console.log('avatarRaw :>> ', avatarRaw)
      console.log('themeRaw :>> ', themeRaw)
      console.log('displayname :>> ', this.newDisplayName)
      const doc = {
        displayName: this.newDisplayName,
        statusMessage: this.newStatusMessage,
        avatar: avatarRaw,
        theme: themeRaw,
        userId: this.$store.state.name.userId,
        userNormalizedLabel: this.$store.state.name.label.toLowerCase(),
      }
      console.log('doc :>> ', doc)

      await this.submitDocument({ contract: 'jembe', type: 'profile', doc })

      await this.fetchProfile(this.$store.state.name.label)

      this.isSaving = false

      this.$emit('nextStep')
    },
  },
}
</script>

<style></style>
