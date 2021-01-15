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
          <span class="font-header pl-2"> Notifications </span>
        </v-row>

        <v-tabs fixed-tabs="" @change="refreshTab($event)">
          <v-tab exact :to="`/notifications`"> All </v-tab>
          <v-tab exact :to="`/notifications/mentions`"> Mentions </v-tab>
        </v-tabs>
        <div v-if="$route.name === 'notifications'">
          <div
            v-for="(notification, i) in getNotifications"
            :key="i"
            :class="{
              newNotification: notification.$createdAt > lastSeenTimestamp,
            }"
          >
            <Jam
              v-if="notification.$type === 'jams'"
              :jam="notification"
              class="tweetcard"
            />
            <Like
              v-if="notification.$type === 'likes'"
              :like="notification"
              class="tweetcard"
            />
            <Mention
              v-if="notification.$type === 'mentions'"
              :mention="notification"
              class="tweetcard"
            />
          </div>
        </div>
        <nuxt-child />
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
import searchBar from '~/components/searchBar'
import Jam from '~/components/notifications/Jam'
import Like from '~/components/notifications/Like'
import Mention from '~/components/notifications/Mention'

export default {
  components: {
    searchBar,
    Jam,
    Like,
    Mention,
  },
  data() {
    return {
      tabRefresh: 0,
      userName: '',
      notificationText: '',
      notificationLikeText: '',
      lastSeenTimestamp: 0,
    }
  },
  computed: {
    ...mapGetters(['getProfile', 'getNotifications', 'getLastSeen']),
  },
  created() {
    this.lastSeenTimestamp = this.getLastSeen('notifications')
    console.log('this.lastSeenTimestamp :>> ', this.lastSeenTimestamp)
    this.saveLastSeen({
      eventType: 'notifications',
      lastSeenTimestamp: Date.now(),
    })
  },
  methods: {
    ...mapActions(['fetchNotifications', 'fetchJamById', 'saveLastSeen']),
    isItNew(notification) {
      return this.lastSeenTimestamp < notification.$createdAt
    },
    refreshTab(number) {
      this.tabRefresh += 1
    },
  },
}
</script>

<style>
.newNotification {
  background-color: #d9effd !important;
}
</style>
