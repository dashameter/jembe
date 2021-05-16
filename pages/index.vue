<template>
  <v-col class="flex-nowrap" style="max-width: 920px">
    <v-row>
      <!-- middle column: compose jam and jam cards -->
      <v-col class="flex-nowrap" style="max-width: 600px">
        <v-container class="pa-0 borders pt-0">
          <div>
            <Desktop />
            <v-divider />
            <v-card flat color="#ffffff" class="my-2 mx-auto" max-width="600">
              <v-card-title> Recent Jams </v-card-title>
            </v-card>
            <v-divider />
            <div v-if="!isFetchJamsFinished">
              <TweetSkeleton v-for="i in 4" :key="i" />
            </div>
            <Jam v-for="(jam, i) in getJams('/discover')" :key="i" :jam="jam" />
          </div>
        </v-container>
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
// eslint-disable-next-line no-unused-vars
import { mapActions, mapGetters } from 'vuex'
import Jam from '~/components/jam'
import TweetSkeleton from '~/components/tweetSkeleton'
import Desktop from '~/components/login/Desktop'
import searchBar from '~/components/searchBar'

export default {
  components: { searchBar, Jam, TweetSkeleton, Desktop },
  data() {
    return {
      isFetchJamsFinished: false,
    }
  },
  computed: {
    ...mapGetters(['getJams']),
  },
  async created() {
    await this.fetchJams({
      view: '/discover',
      orderBy: [['$createdAt', 'desc']],
      where: [['replyToJamId', '==', '']],
    })
    this.isFetchJamsFinished = true
    // await this.refreshLikesInState('/discover')
  },
  methods: {
    ...mapActions(['fetchJams', 'refreshLikesInState']),
  },
}
</script>
