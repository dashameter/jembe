<template>
  <v-col
    :class="{
      fullscreen: $vuetify.breakpoint.mdAndUp,
      halfscreen: $vuetify.breakpoint.smAndDown,
    }"
  >
    <v-row no-gutters>
      <v-col class="flex-nowrap fill-height borders" style="height: 100vh">
        <v-row align="center" no-gutters class="py-2">
          <v-btn icon color="#008de4" @click="$router.go(-1)"
            ><v-icon>mdi-arrow-left</v-icon></v-btn
          >
          <span class="font-header pl-2"> Tags: #{{ $route.params.tag }}</span>
        </v-row>
        <Tweet v-for="(jam, i) in sortedJams" :key="i" :jam="jam" />
      </v-col>
      <v-col
        v-if="$vuetify.breakpoint.mdAndUp"
        class="pt-0"
        style="max-width: 320px"
      >
        <searchBar />
      </v-col>
    </v-row>
  </v-col>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import Tweet from '~/components/tweet'
import searchBar from '~/components/searchBar'

export default {
  components: {
    searchBar,
    Tweet,
  },
  data() {
    return { jams: [] }
  },
  computed: {
    ...mapGetters(['getJamById']),
    sortedJams() {
      const jams = [...this.jams]
      return jams.sort((a, b) => (a.$createdAt < b.$createdAt ? 1 : -1))
    },
  },
  async created() {
    // Fetch jams from dpp
    this.jamIds = await this.fetchJamIdsByTag({ tag: this.$route.params.tag })

    let i = 0
    for (i; i < this.jamIds.length; i++) {
      const jamId = this.jamIds[i]
      const that = this

      this.fetchJamById(jamId).then((jam) => {
        // Add to component array in as-received / unsorted order
        that.jams.push(jam)

        // Refresh meta data for jam
        that.countLikes({ jamId: jam.$id })
        that.countComments({ jamId: jam.$id })
        that.countRejams({ jamId: jam.$id })
      })
    }
  },
  methods: {
    ...mapActions([
      'fetchJamIdsByTag',
      'fetchJamById',
      'countLikes',
      'countComments',
      'countRejams',
    ]),
  },
}
</script>

<style></style>
