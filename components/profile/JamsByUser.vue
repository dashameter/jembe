<template>
  <div>
    <Jam v-for="(jam, i) in getJams($route.path)" :key="i" :jam="jam" />
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
    return { userName: '', isLoadingJams: true }
  },
  computed: {
    ...mapGetters(['getJams']),
  },
  async created() {
    // TODO reset route to correct dpns.label profile
    console.log(this.showReplies)
    this.userName = this.$route.params.profile
    // this.removeOtherJams('') // TODO deprecated
    try {
      console.log('loading jams by user')
      await this.fetchJamsByUser({
        view: this.$route.path,
        userName: this.userName,
        showReplies: this.showReplies,
      })
    } catch (e) {
      console.error(e)
    }
    this.isLoadingJams = false

    // await this.refreshLikesInState()
    // await this.refreshCommentCountInState()
  },
  methods: {
    ...mapActions([
      'fetchJamsByUser',
      'refreshLikesInState',
      'refreshCommentCountInState',
      'removeOtherJams',
    ]),
  },
}
</script>

<style></style>
