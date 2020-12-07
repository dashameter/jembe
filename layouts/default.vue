<template>
  <v-app>
    <v-main>
      <v-row no-gutters class="flex-nowrap fill-height" justify="center">
        <v-col
          v-if="$vuetify.breakpoint.smAndUp && $store.getters.hasSession"
          cols="1"
          style="max-width: 475px"
        >
          <v-row
            justify="end"
            class="sidebar"
            max-width="275px"
            :class="{
              narrowscreen: $vuetify.breakpoint.mdAndDown,
              widescreen: $vuetify.breakpoint.mdAndUp,
            }"
          >
            <v-list
              nav
              class="pl-6 pr-0"
              justify="center"
              rounded
              max-width="275px"
            >
              <nuxt-link :to="'/discover'">
                <v-list-item-avatar class="ml-1" @click="$router.push('/')">
                  <v-img :src="require('~/assets/jembe-logo.png')"> </v-img>
                </v-list-item-avatar>
              </nuxt-link>
              <v-list-item
                v-for="item in items"
                v-show="$vuetify.breakpoint.smAndUp"
                :key="item.title"
                nuxt
                :to="item.to"
                exact
                exact-active-class="navsidebar"
                :class="{
                  narrow: $vuetify.breakpoint.mdAndDown,
                  wide: $vuetify.breakpoint.mdAndUp,
                }"
                class="menu-background pr-0"
              >
                <v-list-item-icon>
                  <v-badge
                    :content="badgeCount(item.to.substring(1))"
                    :value="badgeCount(item.to.substring(1))"
                    color="red"
                    overlap
                  >
                    <v-icon class="menu-text" size="30px">{{
                      item.icon
                    }}</v-icon></v-badge
                  >
                </v-list-item-icon>
                <v-list-item-title
                  v-show="$vuetify.breakpoint.mdAndUp"
                  class="menu-text font-sidebar"
                  v-text="item.title"
                  >{item.title}}
                </v-list-item-title>
              </v-list-item>
              <v-list-item
                v-show="$vuetify.breakpoint.smAndUp"
                nuxt
                :to="profileLink"
                exact
                exact-active-class="navsidebar"
                :class="{
                  narrow: $vuetify.breakpoint.mdAndDown,
                  wide: $vuetify.breakpoint.mdAndUp,
                }"
                class="menu-background pr-0"
              >
                <v-list-item-icon>
                  <v-icon class="menu-text" size="30px"
                    >mdi-account-outline</v-icon
                  >
                </v-list-item-icon>
                <v-list-item-title
                  v-show="$vuetify.breakpoint.mdAndUp"
                  class="menu-text font-sidebar"
                >
                  Profile
                </v-list-item-title>
              </v-list-item>
              <v-list-item
                class="menu-background"
                exact
                :class="{
                  narrow: $vuetify.breakpoint.mdAndDown,
                  wide: $vuetify.breakpoint.mdAndUp,
                }"
                @click="logout()"
              >
                <v-list-item-icon>
                  <v-icon
                    v-show="$vuetify.breakpoint.smAndUp"
                    class="menu-text"
                    style="margin-left: 3px"
                    size="30px"
                    color="dark gray"
                    >mdi-logout</v-icon
                  >
                </v-list-item-icon>
                <v-list-item-title
                  v-show="$vuetify.breakpoint.mdAndUp"
                  class="menu-text font-sidebar"
                  >Logout
                </v-list-item-title>
              </v-list-item>
              <v-list-item v-show="$vuetify.breakpoint.sm">
                <v-btn
                  class="ml-n1 jam-this-text"
                  fab
                  dark
                  small
                  depressed
                  color="#008de4"
                  @click.stop="showComposeJamDialog = true"
                >
                  <v-icon color="white">mdi-feather</v-icon>
                </v-btn>
              </v-list-item>
              <v-list-item v-show="$vuetify.breakpoint.mdAndUp">
                <v-btn
                  rounded
                  depressed
                  color="#008de4"
                  class="jam-this-text"
                  height="47px"
                  width="229px"
                  @click.stop="showComposeJamDialog = true"
                  >Post Jam</v-btn
                >
                <ComposeJamDialog
                  :dialog="showComposeJamDialog"
                  @close="showComposeJamDialog = false"
                />
              </v-list-item>
            </v-list>
          </v-row>
        </v-col>
        <nuxt />
      </v-row>

      <v-snackbar v-model="snackbar.show" :top="'top'" :color="snackbar.color">
        {{ snackbar.text }}
        <v-btn dark absolute text right small @click="snackbar.show = false">
          Close
        </v-btn>
      </v-snackbar>
    </v-main>
  </v-app>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { mapActions, mapGetters } from 'vuex'
import ComposeJamDialog from '~/components/ComposeJamDialog'
// import searchBar from '~/components/searchBar'
// import ComposeJam from '~/components/ComposeJam'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default {
  components: { ComposeJamDialog },
  data() {
    return {
      showComposeJamDialog: false,
      // focused: false,
      snackbar: { show: false, color: 'red', text: '', timestamp: 0 },
      items: [
        {
          icon: 'mdi-home-outline',
          title: 'Home',
          to: '/discover',
        },
        {
          icon: 'mdi-magnify',
          title: 'Explore',
          to: '/search',
        },
        {
          icon: 'mdi-bell-outline',
          title: 'Notifications',
          to: '/notifications',
        },
        {
          icon: 'mdi-email-outline',
          title: 'Messages',
          to: '/messages',
        },
        {
          icon: 'mdi-bookmark-outline',
          title: 'Bookmarks',
          to: '/bookmarks',
        },
      ],
      title: 'Jembe',
      drawer: false,
      numberOfNewNotifications: 0,
    }
  },
  computed: {
    ...mapGetters(['getJams', 'getProfile', 'getLastSeen', 'badgeCount']),
    profileLink() {
      return '/' + this.$store.state.name.label
    },
    isIndexRoute() {
      const isIndex = this.$route.name === 'index'
      console.log({ isIndex })
      return isIndex
    },
  },
  async created() {
    // await this.initWallet()
    this.$store.watch(
      (state) => state.snackbar.timestamp,
      () => {
        console.log('state.snackbar :>> ', this.$store.state.snackbar)
        this.snackbar = JSON.parse(JSON.stringify(this.$store.state.snackbar))
        console.log('this.snackbar :>> ', this.snackbar)
      }
    )
    await this.initOrCreateAccount({})
    this.loopSyncSession() // TODO phaseb, launch this userId specific after name entry
    this.loopFetchNotifications()
  },
  mounted() {},
  methods: {
    ...mapActions([
      // 'initWallet',
      'initOrCreateAccount',
      'syncSession',
      'resetStateKeepAccounts',
      'fetchJams',
      'refreshLikesInState',
      'fetchLastSeen',
      'fetchNotifications',
      'saveLastSeen',
    ]),
    logout() {
      this.resetStateKeepAccounts()
      this.$router.push('/')
      this.drawer = false
      this.initOrCreateAccount({})
      this.fetchJams({
        orderBy: [['$createdAt', 'desc']],
        view: '/discover',
      })
      // await this.refreshLikesInState({ view: '/discover' })
    },
    goto(route) {
      this.$router.push(route)
    },
    async loopFetchNotifications() {
      if (this.$store.getters.hasSession) {
        const promises = [
          this.fetchLastSeen('notifications'),
          this.fetchNotifications(),
        ]
        await Promise.all(promises)
      }
      await sleep(5000)
      this.loopFetchNotifications()
    },
    async loopSyncSession() {
      console.log('loopSyncSession')
      if (this.$store.state.identityId === null) {
        await sleep(1000)
        this.loopSyncSession()
        return
      }
      // console.log('loopSyncSession()')
      await this.syncSession()

      // console.log(
      //   'Login state: state.session',
      //   this.$store.state.session
      // )

      // State change to LoggedIn
      if (this.$store.getters.hasSession && this.isIndexRoute) {
        this.$router.push('/discover')
      }

      // State change to LoggedOut
      if (!this.$store.getters.hasSession && !this.isIndexRoute) {
        this.logout()
      }
      await sleep(5000)
      this.loopSyncSession()
    },
  },
}
</script>

<style>
* {
  text-transform: none !important;
}
.linkify a {
  color: #03619c !important;
  text-decoration: none !important;
}
.linkify a:hover {
  text-decoration: underline !important;
}
.navsidebar {
  /* background: white !important; */
  color: white !important;
  font: blue;
}
.font-header {
  color: rgba(20, 23, 26, 0.8) !important;
  font-size: 20px;
  font-weight: bold;
  font-family: 'Montserrat';
}
.menu-text {
  color: rgba(20, 23, 26, 0.8) !important;
}
.menu-text:hover {
  color: #008de4 !important;
}
.menu-text:active {
  color: #008de4 !important;
}
.menu-background:hover {
  background: #008de41c;
}
.menu-background:active {
  background: #008de41c;
}
.menu-background:hover .menu-text {
  color: #008de4 !important;
}
.font-sidebar {
  font-size: 19px;
  font-weight: bold;
  font-family: 'Montserrat';
  display: inline;
  line-height: 1.3125;
}
.jam-this-text {
  color: white !important;
  background-color: #008de4;
  font-size: 16px !important;
  font-weight: 900;
  font-family: 'Montserrat';
  display: inline;
  line-height: 1.3125;
}
.jam-this-text:hover {
  color: white;
  background-color: #0e7fc5 !important;
  font-size: 16px;
  font-weight: 900;
  font-family: 'Montserrat';
  display: inline;
  line-height: 1.3125;
}
.tweetcard {
  border-left: none;
  border-right: none;
  /* border-color: #ece7e7d8; made border color lighter since the top and bottom borders overlap and become darker */
}
.tweetcard:hover {
  background-color: #f5f8fb !important;
}
.borders {
  max-width: 600px;
  border-left: solid;
  border-right: solid;
  border-color: #e2dfdfd8;
  border-width: 1px;
  z-index: 1;
}
.sidebar {
  position: sticky;
  top: 0;
  margin-right: 0px;
}
.fullscreen {
  max-width: 920px;
}
.halfscreen {
  max-width: 600px;
}
.mobile {
  width: 100vw;
}
</style>

<style scoped>
.clickin {
  border-color: #008de4 solid !important;
  fill: white !important;
}
.narrow {
  max-width: 44px;
  /* margin-right: 4px; */
}
.wide {
  max-width: 275px;
  /* margin-right: 20px; */
}
.narrowscreen {
  padding-right: 10px;
}
.widescreen {
  padding-right: 25px;
  /* margin-right: 20px; */
}
.font-searchbar {
  font-size: 15px;
  font-family: 'Arial';
  display: inline;
  line-height: 1.3125;
  background: #03619c !important;
}
</style>
