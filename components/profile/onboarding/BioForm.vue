<template>
  <div>
    <v-textarea
      v-model="newStatusMessage"
      label="Bio"
      placeholder="Add your Bio"
      rows="3"
      counter="160"
    >
    </v-textarea>
    <v-card-actions>
      <v-spacer />
      <v-btn
        v-if="newStatusMessage != profile.statusMessage"
        :loading="isSaving"
        rounded
        color="#008de4"
        dark
        @click="saveBio"
        >Save your Bio</v-btn
      >
      <v-spacer />
    </v-card-actions>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
// import crypto from '@dashevo/dashcore-lib'

export default {
  name: 'BioForm',
  data() {
    return {
      profile: {},
      isSaving: false,
      newStatusMessage: '',
      rules: [
        (value) =>
          !value ||
          value.size < 14000 ||
          'Avatar size should be less than 11 kb!',
      ],
    }
  },
  computed: { ...mapGetters(['getProfile']) },
  created() {
    this.profile = this.getProfile(this.$store.state.name.label)
    this.newStatusMessage = this.profile.statusMessage
  },
  methods: {
    ...mapActions(['submitDocument', 'fetchProfile', 'saveToDatastore']),
    handleImage(e) {
      console.log('e :>> ', e)
      const selectedImage = e
      this.createBase64Image(selectedImage)
    },
    createBase64Image(fileObject) {
      const reader = new FileReader()

      reader.onload = (e) => {
        this.newAvatar = e.target.result
      }
      reader.readAsDataURL(fileObject)
    },
    async saveBio() {
      this.isSaving = true
      console.log('this.profile :>> ', this.profile)
      const { avatarRaw, themeRaw } = this.profile
      console.log('avatarRaw :>> ', avatarRaw)
      console.log('themeRaw :>> ', themeRaw)
      const doc = {
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
