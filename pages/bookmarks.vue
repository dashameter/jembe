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
          <span class="font-header pl-2"> Bookmarks </span>
        </v-row>
        <v-row class="handle pl-14 mt-n3 mb-2">
          @{{ $store.state.accountDPNS.label }}
        </v-row>
        <v-divider />

        <div>
          <TweetWrapper
            v-for="(jam, i) in getBookmarkedJams"
            :key="i"
            :jam="jam"
          />
        </div>
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
import TweetWrapper from '~/components/bookmarks/TweetWrapper'
import searchBar from '~/components/searchBar'

export default {
  components: {
    TweetWrapper,
    searchBar,
  },
  data() {
    return {}
  },
  computed: {
    ...mapGetters(['getBookmarkedJams']),
  },
  async created() {
    await this.fetchBookmarks()
  },
  methods: {
    ...mapActions(['fetchBookmarks']),
  },
}
</script>

<style scoped>
.handle {
  color: #757575;
  font-size: 13px;
}
</style>
