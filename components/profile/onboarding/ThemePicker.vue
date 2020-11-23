<template>
  <div class="text-left">
    <v-img :src="newTheme" height="194"></v-img>
    <v-file-input
      style="position: absolute; left: 50%; margin-left: -12px; z-index: 1"
      :rules="rules"
      accept="image/*"
      placeholder="Pick a theme"
      prepend-icon="mdi-camera"
      label="Theme"
      hide-input
      @change="handleImage"
    />
    <v-avatar size="135" class="avatar" color="white">
      <v-img :src="getProfile($store.state.name.label).avatar" alt="" />
    </v-avatar>
    <v-card-subtitle class="text-center">
      Max filesize is 11 kb.
    </v-card-subtitle>
    <v-card-actions>
      <v-spacer />
      <v-btn
        v-if="newTheme != profile.theme"
        :loading="isSaving"
        rounded
        color="#008de4"
        dark
        style="z-index: 1"
        >Save Theme</v-btn
      >
      <v-spacer />
    </v-card-actions>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
// import crypto from '@dashevo/dashcore-lib'

export default {
  name: 'ThemePicker',
  data() {
    return {
      profile: {},
      isSaving: false,
      newTheme: '',
      rules: [
        (value) =>
          !value ||
          value.size < 14000 ||
          'Theme size should be less than 11 kb!',
      ],
    }
  },
  computed: { ...mapGetters(['getProfile']) },
  created() {
    this.profile = this.getProfile(this.$store.state.name.label)
    this.newTheme = this.profile.theme
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
        this.newTheme = e.target.result
      }
      reader.readAsDataURL(fileObject)
    },
    async saveTheme() {
      this.isSaving = true
      const { statusMessage, avatarRaw } = this.profile

      const blobHash = await this.saveToDatastore(this.newTheme)

      const doc = {
        statusMessage,
        theme: 'datastore:' + blobHash,
        avatar: avatarRaw,
        userId: this.$store.state.name.userId,
        userNormalizedLabel: this.$store.state.name.label.toLowerCase(),
      }

      await this.submitDocument({ contract: 'jembe', type: 'profile', doc })

      await this.fetchProfile(this.$store.state.name.label)

      this.isSaving = false

      this.$emit('nextStep')
    },
  },
}
</script>

<style scoped>
.avatar {
  margin-top: -50px;
  border: white;
  border-style: solid;
  border-width: 4px;
  margin-left: 10px;
}
</style>
