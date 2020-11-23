<template>
  <div>
    <div style="justify-content: center; align-items: center; display: flex">
      <v-avatar color="white" size="170px">
        <v-img :src="newAvatar" />
      </v-avatar>
      <v-file-input
        style="position: absolute; left: 50%; margin-left: -12px"
        :rules="rules"
        accept="image/*"
        placeholder="Pick an avatar"
        prepend-icon="mdi-camera"
        label="Avatar"
        hide-input
        @change="handleImage"
      />
    </div>
    <v-card-subtitle> Max filesize is 11 kb. </v-card-subtitle>
    <v-card-actions>
      <v-spacer />
      <v-btn
        v-if="newAvatar != profile.avatar"
        :loading="isSaving"
        rounded
        color="#008de4"
        dark
        @click="saveAvatar"
        >Save Profile Picture</v-btn
      >
      <v-spacer />
    </v-card-actions>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
// import crypto from '@dashevo/dashcore-lib'

export default {
  name: 'AvatarPicker',
  data() {
    return {
      profile: {},
      isSaving: false,
      newAvatar: '',
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
    this.newAvatar = this.profile.avatar
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
    async saveAvatar() {
      this.isSaving = true
      const { statusMessage, themeRaw } = this.profile

      const blobHash = await this.saveToDatastore(this.newAvatar)

      const doc = {
        statusMessage,
        avatar: 'datastore:' + blobHash,
        theme: themeRaw,
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

<style></style>
