<template>
  <v-col class="flex-nowrap" style="max-width: 920px">
    <v-row no-gutters>
      <!-- middle column: compose jam and jam cards -->
      <v-col class="flex-nowrap pt-0" style="max-width: 600px">
        <v-container class="pa-0 borders pt-0">
          <div>
            <v-row
              align="center"
              class="pl-3 pt-1 pb-0"
              no-gutters
              style="max-width: 600px"
            >
              <v-btn icon color="#008de4" @click="$router.go(-1)"
                ><v-icon>mdi-arrow-left</v-icon></v-btn
              >
              <span class="font-header pl-3 pt-1 pb-1"> Thread </span>
            </v-row>
            <v-divider />
            <Jam
              v-for="(jam, i) in getJams($route.path)"
              :key="i"
              :jam="jam"
              :total-jams="getJams($route.path).length"
            />
            <div v-if="isLoadingThread" class="text-center pt-6">
              <v-progress-circular
                color="#008de4"
                size="22"
                width="3"
                indeterminate
              />
            </div>
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
import searchBar from '~/components/searchBar'

export default {
  components: { Jam, searchBar },
  data() {
    return { jamId: '', isLoadingThread: true }
  },
  computed: {
    ...mapGetters(['getJams']),
  },
  async created() {
    // TODO reset route to correct dpns.label profile
    this.jamId = this.$route.params.jamId
    // this.removeOtherJams(this.jamId)
    await this.fetchReplyThread({
      view: this.$route.path,
      jamId: this.jamId,
    })
    this.isLoadingThread = false

    // await this.refreshLikesInState()
    // await this.refreshCommentCountInState()
  },
  methods: {
    ...mapActions([
      'fetchReplyThread',
      'refreshLikesInState',
      'refreshCommentCountInState',
      'removeOtherJams',
    ]),
  },
}
</script>

<style scoped>
.font-header {
  color: rgba(20, 23, 26, 0.8) !important;
  font-size: 19px;
  font-weight: bold;
  font-family: 'Montserrat';
}
</style>
