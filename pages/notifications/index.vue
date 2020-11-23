<template>
  <v-col
    :class="{
      fullscreen: $vuetify.breakpoint.mdAndUp,
      halfscreen: $vuetify.breakpoint.smAndDown,
    }"
  >
    <v-row no-gutters>
      <v-col class="flex-nowrap fill-height borders">
        <!-- <v-row> -->
        <!-- middle column: compose jam and jam cards -->
        <!-- <v-col class="flex-nowrap py-2" style="max-width: 600px"> -->
        <!-- <v-container class="pa-0 borders pt-0"> -->
        <v-row align="center" no-gutters class="headerbar py-2">
          <v-btn icon color="#008de4" @click="$router.go(-1)"
            ><v-icon>mdi-arrow-left</v-icon></v-btn
          >
          <span class="font-header pl-2"> Notifications </span>
        </v-row>
        <!-- </v-container> -->
        <!-- </v-col> -->

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
            <Jam v-if="notification.$type === 'jams'" :jam="notification" />
            <Like v-if="notification.$type === 'likes'" :like="notification" />
            <Mention
              v-if="notification.$type === 'mentions'"
              :mention="notification"
            />
          </div>
        </div>
        <nuxt-child />

        <!-- <v-card
      v-for="(notificationLikes, x) in getNotificationLikes"
      :key="x"
      flat
      tile
      outlined
      class="px-3 py-2 tweetcard"
    >
      {{ notificationLikes }}
      <v-row no-gutters>
        <v-col
          style="max-width: 50px; max-height=88px;"
          class="mr-2"
          justify="end"
          ><v-btn icon style="float: right">
            <v-icon size="30" color="pink">mdi-heart</v-icon>
          </v-btn></v-col
        >
        <v-col>
          <nuxt-link :to="'/' + notificationLikes.data.userName">
            <v-avatar color="lightgray" size="30">
              <v-img
                class="elevation-6"
                :src="getProfile(notificationLikes.data.userName).avatar"
              ></v-img> </v-avatar
          ></nuxt-link>
          <div>
            <span style="font-weight: bold"
              >{{ notificationLikes.data.userName }} </span
            >liked your Jam
          </div>
          <span style="color: gray">{{ notificationLikeText.text }} </span>
          <span style="color: gray"> {{ notificationLikeText }}</span>
        </v-col>
      </v-row>
    </v-card> -->
        <!-- v-if="retweet", like or reply to (each a method below)
    like: if other user clicks like on one of your tweets -> emit event: show jam.text for that tweet
    <3 avatar
      userName "liked your Jam"
      jam.text [gray] -->

        <!-- rejam: if other user clicks rejam on one of your tweets -> emit event: show
    rejam icon    avatar
    "<username>" "Rejammed your Jam"
    jam.text for that jam  -->
        <!-- my jamid is the rejam id on dash platform -->

        <!-- mentions:
      tweet card + TWEET + "Replying to @you" -->

        <!-- <v-col>
      <v-badge
        :content="countNewNotifications()"
        :value="countNewNotifications()"
        color="green"
        ><v-icon large color="blue">mdi-balloon</v-icon></v-badge
      >
    </v-col> -->
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
  props: {
    jam: {
      type: Object,
      default() {
        return {}
      },
    },
  },
  data() {
    return {
      tabRefresh: 0,
      userName: '',
      notificationText: '',
      notificationLikeText: '',
      lastSeenTimestamp: 0,
      // numberOfNewNotifications: 0,
      // jamUser: '',
    }
  },
  computed: {
    ...mapGetters(['getProfile', 'getNotifications', 'getLastSeen']),
  },
  created() {
    // const that = this
    // for (let i = 0; i < this.getNotifications.length; i++) {
    //   const arrivingnotifications = await that.fetchJamById(
    //     this.getNotifications[i].data.reJamId
    //   )
    //   this.notificationText = arrivingnotifications
    // }
    // this.getNotifications.forEach(async function originalJam(ntf) {
    // console.log('notificationid', ntf.data.reJamId)
    // })
    // this.jamUser = this.$route.params.profile
    // passes the id of the jam; gets jam from the dash platform protocol and that has the text
    // for (let x = 0; x < this.getNotificationLikes.length; x++) {
    //   const arrivingLikeNotifications = await that.fetchJamById(
    //     this.getNotificationLikes[x].data.jamId
    //   )
    //   console.log('hi', this.getNotificationLikes[0].data.likedUserId)
    //   this.notificationLikeText = arrivingLikeNotifications
    //   console.log('hello', this.notificationLikeText)
    // }
    // update timestamp to store. timestamp is Date.now()

    this.lastSeenTimestamp = this.getLastSeen('notifications')
    console.log('this.lastSeenTimestamp :>> ', this.lastSeenTimestamp)
    this.saveLastSeen({
      eventType: 'notifications',
      lastSeenTimestamp: Date.now(),
    })
  },
  methods: {
    ...mapActions(['fetchNotifications', 'fetchJamById', 'saveLastSeen']),
    // showNotificationText(){
    //   this.notificationData.filter(this.notificationData.id === )
    // }
    // async displayJamText() {
    //   await this.fetchJamById()
    // },
    isItNew(notification) {
      return this.lastSeenTimestamp < notification.$createdAt
    },
    // countNewNotifications() {
    //   const numberOfNewNotifications = this.$store.state.notifications.filter(
    //     (n) => {
    //       return n.$createdAt > this.lastSeenTimestamp
    //     }
    //   )
    //   console.log('NotificationsCount', numberOfNewNotifications.length)
    //   return numberOfNewNotifications.length
    // },
    refreshTab(number) {
      this.tabRefresh += 1
    },
  },
}
</script>

<style>
.headerbar {
  /* position: sticky; */
  /* top: 0; */
  height: 54px;
  background-color: white;
  /* border-bottom: solid 1px;
  border-bottom-color: lightgray; */
}
.newNotification {
  background-color: #d9effd !important;
}
</style>
