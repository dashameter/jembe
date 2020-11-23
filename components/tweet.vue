<template>
  <div class="px-0">
    <v-card
      class="my-0 mx-0 tweetcard px-4"
      :class="{ bottomborder: !showThreadConnector }"
      elevation="0"
      tile=""
      :ripple="false"
      style="max-width: 600px; background-color: inherit !important"
      @click="goTo(toThreadLink, $event)"
    >
      <v-row
        v-if="jam.reJamByUsername"
        class="metaline"
        style="margin-bottom: 2px"
      >
        <v-col class="leftcol pa-0 pt-2"
          ><v-row justify="end" no-gutters="">
            <v-icon small>mdi-twitter-retweet</v-icon></v-row
          ></v-col
        >
        <v-col class="pa-0 metaline" style="z-index: 1">
          <nuxt-link :to="'/' + jam.reJamByUsername"
            ><span class="overline topline"
              >Rejam by {{ jam.reJamByUsername }}</span
            ></nuxt-link
          >
        </v-col>
      </v-row>
      <v-row class="d-flex flex-nowrap">
        <v-col class="leftcol pa-0" style="display: flex; flex-flow: column"
          ><v-row justify="end" no-gutters="" style="max-height: 50px">
            <nuxt-link :to="'/' + jam.userName">
              <v-avatar style="margin-top: 13px" color="lightgray" size="48">
                <v-img
                  class="elevation-6"
                  :src="getProfile(jam.userName).avatar"
                ></v-img> </v-avatar></nuxt-link
          ></v-row>
          <v-row class="mb-n2 mt-4" align="stretch" justify="center">
            <div v-show="showThreadConnector" class="connector-line"></div>
          </v-row>
        </v-col>
        <v-col class="pa-0 mt-1">
          <v-row
            class="pt-2 d-inline-block text-truncate"
            justify="space-between"
            no-gutters
            :class="{
              mobiletitle: $vuetify.breakpoint.xs,
              notmobile: $vuetify.breakpoint.smAndUp,
            }"
          >
            <span>
              <nuxt-link :to="'/' + jam.userName" class="jam-name"
                ><span id="username" class="username"> {{ jam.userName }}</span>
                <span class="handle"> @{{ jam.userName }} · </span>
              </nuxt-link>
              <span class="time-posted"
                ><nuxt-link :to="'/' + jam.userName + '/status/' + jam.$id">
                  {{ posted(jam.$createdAt) }}</nuxt-link
                ></span
              >
            </span>
            <v-btn
              class="mt-n1"
              align="center"
              small
              dense
              icon
              absolute
              right
              color="#008de4"
            >
              <v-icon
                :disabled="!$store.getters.hasDelegatedCredentials"
                @click.stop="follow(jam.userId)"
                >{{
                  getiFollow(jam.userId)
                    ? 'mdi-account-plus'
                    : 'mdi-account-plus-outline'
                }}
              </v-icon>
            </v-btn>
          </v-row>
          <v-row
            style="display: block"
            :class="{
              mobile: $vuetify.breakpoint.xs,
              notmobile: $vuetify.breakpoint.smAndUp,
            }"
            no-gutters
          >
            <div v-linkify="jam.text" />
          </v-row>

          <v-row
            no-gutters
            class="pt-2 pb-2 pr-3"
            style="justify-content: space-between; max-width: 425px"
            @click="showLoginNag()"
          >
            <div class="hoverblue ml-n2">
              <v-btn
                icon
                :disabled="!$store.getters.hasDelegatedCredentials"
                @click.stop="replyTo()"
              >
                <v-icon size="19px">mdi-comment-outline</v-icon>
              </v-btn>
              <span class="subheading ml-n1 mr-2" style="font-size: 14px">{{
                $store.state.commentsCount[jam.$id]
                  ? $store.state.commentsCount[jam.$id].comments
                  : '?'
              }}</span>
            </div>
            <div class="hovergreen">
              <v-btn
                icon
                :disabled="!$store.getters.hasDelegatedCredentials"
                @click.stop="reJam(jam.$id)"
              >
                <v-icon size="22px" class="mr-1">mdi-twitter-retweet</v-icon>
              </v-btn>
              <span class="subheading mr-2 ml-n1" style="font-size: 14px">{{
                $store.state.rejamsCount[jam.$id]
                  ? $store.state.rejamsCount[jam.$id].rejams
                  : '?'
              }}</span>
            </div>
            <div class="hoverpink">
              <v-btn
                icon
                :color="
                  getiLiked(jam.$id) == !isLiking
                    ? 'rgba(228, 68, 129, 0.911)'
                    : ''
                "
                :disabled="!$store.getters.hasDelegatedCredentials"
                @click.stop="like(jam.$id)"
              >
                <v-icon
                  size="20px"
                  class="mr-1"
                  :class="{ heart: isLiking, animate: isLiking }"
                  >{{
                    getiLiked(jam.$id) == !isLiking
                      ? 'mdi-heart'
                      : 'mdi-heart-outline'
                  }}</v-icon
                >
              </v-btn>
              <span
                class="subheading mr-2 ml-n1"
                style="font-size: 14px"
                :class="{ likecount: getiLiked(jam.$id) }"
                >{{ getLikesCount(jam.$id) }}
              </span>
            </div>
            <div class="hoverblue">
              <v-btn
                icon
                :disabled="!$store.getters.hasDelegatedCredentials"
                @click.stop="tip(jam.$id)"
              >
                <v-icon
                  size="20px"
                  class="mr-1 dashicon"
                  :disabled="!$store.getters.hasDelegatedCredentials"
                  style="fill: #757575"
                  >$dash
                </v-icon>
              </v-btn>
              <span
                class="subheading mr-2 ml-n1"
                style="font-size: 14px"
              ></span>
            </div>
          </v-row>
        </v-col>
      </v-row>
    </v-card>
    <ComposeJamDialog
      :dialog="showComposeJamDialog"
      :reply-to-jam="jam"
      @close="showComposeJamDialog = false"
    />
  </div>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { mapActions, mapGetters } from 'vuex'
// import linkify from 'vue-linkify'
// import Vue from 'vue'

// import linkifyStr from 'linkifyjs/string'
import * as linkify from 'linkifyjs'
import mention from 'linkifyjs/plugins/mention'
import hashtag from 'linkifyjs/plugins/hashtag'

import ComposeJamDialog from '~/components/ComposeJamDialog.vue'

mention(linkify)
hashtag(linkify)

// Vue.directive('linkified', linkify)

export default {
  name: 'Tweet',
  components: { ComposeJamDialog },
  props: {
    jam: {
      type: Object,
      default() {
        return {}
      },
    },
    totalJams: {
      type: Number,
      default() {
        return 0
      },
    },
  },
  data() {
    return {
      showComposeJamDialog: false,
      isLiking: false,
      replyToJamText: '',
      replyToJamId: '',
      opUserId: '',
      opUserName: '',
    }
  },
  computed: {
    ...mapGetters([
      'getJams',
      'getProfile',
      'getiLiked',
      'getLikesCount',
      'getCommentsCount',
      'getiFollow',
    ]),
    toThreadLink() {
      if (this.$store.getters.hasDelegatedCredentials) {
        return '/' + this.jam.userName + '/status/' + this.jam.$id
      } else {
        return ''
      }
    },
    showThreadConnector() {
      // Show the connector line if we are in the thread view
      if (this.$route.name === 'profile-status-jamId') {
        // Don't show the connector line if it is the last tweet of the conversation
        if (this.$vnode.key === this.totalJams - 1) {
          return false
        }

        return true
      } else {
        return false
      }
    },
  },
  created() {
    console.log('linkify.find(str) :>> ', linkify.find(this.jam.text))
  },
  methods: {
    ...mapActions([
      'likeJam',
      'countLikes',
      'followJammer',
      'showSnackbar',
      'sendDash',
      'sendJamAndRefreshJams',
      'fetchJamById',
    ]),
    posted(posttime) {
      const eventDate = new Date(posttime)
      const now = new Date(Date.now())
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'April',
        'May',
        'June',
        'July',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ]

      // const sameMinutes = now.getMinutes() === eventDate.getMinutes()
      // const sameHours = now.getHours() === eventDate.getHours()
      const sameDay = now.getDate() === eventDate.getDate()
      const sameMonth = now.getMonth() === eventDate.getMonth()
      const sameYear = now.getFullYear() === eventDate.getFullYear()

      const min = 1 * 60 * 1000 // 1 minute
      const hour = 1 * 60 * 60 * 1000 // 1 hour

      // Less than a minute elapsed, display 'seconds'
      if (now - eventDate < min) {
        const sec = Math.floor((now - eventDate) / 1000)
        return sec + ' sec'
      }

      // Less than an hour elapsed, display 'minutes'
      if (now - eventDate < hour) {
        const minutes = Math.floor((now - eventDate) / min)
        return minutes + ' min'
      }

      // If same day before midnight, display 'hours'
      if (sameDay && sameMonth && sameYear) {
        const hours = Math.floor((now - eventDate) / hour)
        return hours + 'h'
      }

      // If rolling past midnight, display 'date'
      if (sameMonth && sameYear) {
        // const day = now.getDate() - eventDate.getDate()  // to calculate the number of days ago
        return months[eventDate.getMonth()] + ' ' + eventDate.getDate() + ''
      }

      if (sameYear) {
        return months[eventDate.getMonth()] + ' ' + eventDate.getFullYear() + ''
      } else {
        return (
          months[eventDate.getMonth()] +
          ' ' +
          eventDate.getDate() +
          ', ' +
          eventDate.getFullYear()
        )
      }
    },
    async reJam(jamId) {
      await this.sendJamAndRefreshJams({
        jamText: '',
        replyToJamId: '',
        reJamId: jamId,
        opUserId: this.jam.userId,
        opUserName: this.jam.userName,
      })
    },
    goToJamId(jamId, jammerName) {
      this.$router.push(`/${jammerName}/status/${jamId}`)
    },
    goTo(href, event) {
      console.log('event :>> ', event)
      console.log('href :>> ', href)
      // Don't follow parent div @click event if child <a /> link is clicked
      if (event.srcElement.className !== 'linkified') this.$router.push(href)
    },
    async showLoginNag() {
      if (!this.$store.getters.hasDelegatedCredentials) {
        await this.showSnackbar({
          color: '#008de4',
          text: 'Please login first.',
        })
      }
    },
    tip(i) {
      console.log('tipping i', i)
      this.sendDash({ amount: 10000 })
    },
    date($createdAt) {
      return new Date($createdAt)
    },
    // eslint-disable-next-line require-await
    async replyTo() {
      this.replyToJamText = this.jam.text
      this.replyToJamId = this.jam.$id
      this.showComposeJamDialog = true
    },
    async follow(jammerId) {
      const isFollowing = !this.getiFollow(jammerId)
      console.log('isFollowing :>> ', isFollowing)
      await this.showSnackbar({
        // text: `You are now following {jammerId}`,
        text: `Following: ${isFollowing}`,
        color: '#008de4',
      })
      await this.followJammer({
        jammerId,
        userName: this.jam.userName,
        isFollowing,
      })
      this.$forceUpdate()
    },
    async like(jamId) {
      this.isLiking = true
      const isLiked = !this.getiLiked(jamId)
      console.log('{ jamId, isLiked } :>> ', { jamId, isLiked })
      await this.likeJam({
        jamId,
        isLiked,
        userName: this.$store.state.name.label,
        opUserId: this.jam.userId,
        opUserName: this.jam.userName,
      })
      await this.countLikes({ jamId })
      this.isLiking = false
    },
  },
}
</script>

<style>
.linkified {
  color: black !important;
}
</style>
<style scoped>
.connector-line {
  width: 2px;
  /* background-color: rgb(192, 189, 189); */
  background-color: rgba(202, 197, 197, 0.904);
  /* flow-grow: 1; */
  /* position: absolute; */
  z-index: 1;
}
.leftcol {
  max-width: 50px;
  margin-right: 10px;
}
.username {
  color: black;
  text-decoration: none;
  font-size: 16px;
  align-self: center;
  font-weight: 600;
  letter-spacing: 0.0125em;
  line-height: 1.1;
}
.jam-name {
  text-decoration: none;
}
.jam-name:hover .username {
  text-decoration: underline;
}
.topline {
  font-size: 14px;
  text-transform: none !important;
  text-decoration: none !important;
}
.metaline {
  max-height: 15px !important;
  height: 15px !important;
  padding-top: 10px;
  padding-bottom: 10px;
}
.metaline a {
  text-decoration: none;
  color: #787878 !important;
}
.metaline a:hover {
  text-decoration: underline;
}
.handle {
  text-decoration: none;
  font-size: 16px;
  color: #787878 !important;
}
.time-posted a {
  text-decoration: none;
  font-size: 16px;
  color: #787878 !important;
}
.time-posted a:hover {
  text-decoration: underline;
}
.lowercase {
  text-transform: none !important;
}

.hoverblue {
  color: #757575 !important;
  caret-color: #757575 !important;
}
.hoverblue:hover {
  color: #008de4 !important;
  caret-color: #008de4 !important;
}
.hoverblue:hover button {
  color: #008de4 !important;
  caret-color: #008de4 !important;
}
.hoverblue:hover .dashicon {
  fill: #008de4 !important;
  color: #008de4 !important;
  caret-color: #008de4 !important;
}
.hovergreen {
  color: #757575 !important;
  caret-color: #757575 !important;
}
.hovergreen:hover {
  color: rgb(28, 161, 28) !important;
  caret-color: rgb(28, 161, 28) !important;
}
.hovergreen:hover button {
  color: rgb(28, 161, 28) !important;
  caret-color: rgb(28, 161, 28) !important;
}
.hoverpink {
  color: #757575 !important;
  caret-color: #757575 !important;
  /* caret-color: #757575 !important; */
}
.hoverpink:hover {
  color: rgba(228, 68, 129, 0.911) !important;
  caret-color: rgba(228, 68, 129, 0.911) !important;
}
.hoverpink:hover button {
  color: rgba(228, 68, 129, 0.911) !important;
  caret-color: rgba(228, 68, 129, 0.911) !important;
}
.likecount {
  color: rgba(228, 68, 129, 0.911);
}
.tweetcard {
  border-left: none;
  border-right: none;
  /* border-color: #ece7e7d8; made border color lighter since the top and bottom borders overlap and become darker */
}
.bottomborder {
  border-bottom: 1px solid;
  border-color: #e2dfdfd8;
}
.tweetcard:hover {
  background-color: #f5f8fb !important;
}
.mobile {
  max-width: 290px;
  padding-right: 12px;
}
.mobiletitle {
  max-width: 250px;
  padding-right: 12px;
}
.notmobile {
  max-width: 525px;
  padding-right: 20px;
}
.heart {
  animation: heartbeat 1s infinite;
}

@keyframes heartbeat {
  0% {
    transform: scale(1.25);
  }
  20% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.25);
  }
  60% {
    transform: scale(1);
  }
  80% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1.25);
  }
}
</style>
