<template>
  <div>
    <Jam
      v-for="(jam, i) in getLikedJamsByUsername(userName)"
      :key="i"
      :jam="jam"
    />
    <div v-if="isLoadingJams" class="mt-8 text-center">
      <v-progress-circular color="#008de4" size="22" width="3" indeterminate />
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import Jam from '~/components/jam'

export default {
  components: { Jam },
  data() {
    return { userName: '', userId: '', isLoadingJams: false }
  },
  computed: {
    ...mapGetters(['getLikedJamsByUsername']),
  },
  async created() {
    this.userName = this.$route.params.profile
    this.isLoadingJams = true
    try {
      this.userId = (await this.resolveUsername(this.userName)).$id
      await this.fetchLikesByUser({
        userId: this.userId,
        userName: this.userName,
      })
    } catch (e) {
      console.error(e)
    }
    this.isLoadingJams = false

    this.getLikedJamsByUsername(this.$route.params.profile).forEach((x) => {
      const jamId = x.$id
      this.countComments({ jamId })
      this.countLikes({ jamId })
      this.countRejams({ jamId })
    })
  },
  methods: {
    ...mapActions([
      'fetchLikesByUser',
      'countComments',
      'countLikes',
      'countRejams',
      'resolveUsername',
    ]),
  },
}
</script>
