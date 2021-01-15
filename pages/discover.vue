<template>
  <v-col
    class="flex-nowrap pt-0 pr-0"
    :class="{
      fullscreen: $vuetify.breakpoint.mdAndUp,
      halfscreen: $vuetify.breakpoint.smAndDown,
    }"
  >
    <v-row no-gutters justify="center">
      <!-- middle column: compose jam and jam cards -->
      <v-col class="flex-nowrap py-0 pr-0" style="max-width: 600px">
        <v-container class="pa-0 borders pt-0" style="height: 100vh">
          <v-row>
            <v-col class="py-2">
              <v-row
                v-if="$vuetify.breakpoint.smAndUp"
                class="pl-2 pb-1 pt-2"
                align="center"
                no-gutters
              >
                <span class="font-header pb-2 pl-4"> Home </span>
              </v-row>
              <v-row
                v-if="$vuetify.breakpoint.xs"
                class="pl-2 pb-1 pt-0 pr-2"
                align="center"
                no-gutters
              >
                <v-list-item-avatar class="pl-0 ml-0">
                  <v-badge
                    dot
                    offset-x="14"
                    offset-y="13"
                    :content="badgeCount('notifications')"
                    :value="badgeCount('notifications')"
                    color="red"
                    overlap
                  >
                    <v-avatar
                      size="40"
                      color="lightgray"
                      @click.stop="togglemenu = !togglemenu"
                    >
                      <v-img
                        class="elevation-6"
                        :src="getProfile($store.state.name.label).avatar"
                      ></v-img>
                    </v-avatar>
                  </v-badge>
                </v-list-item-avatar>
                <span class="font-header pt-1 pb-1"> Home </span>
              </v-row>
              <v-divider />
            </v-col>
          </v-row>
          <navbarMobile
            v-if="togglemenu"
            :togglemenu="togglemenu"
            @close="togglemenu = false"
          />

          <ComposeJam v-if="$vuetify.breakpoint.smAndUp" />
          <!-- <Jam v-for="(jam, i) in getJams('/discover')" :key="i" :jam="jam" /> -->
          <Tweet v-for="(jam, i) in getJams('/discover')" :key="i" :jam="jam" />
          <OnboardDialog
            v-if="showOnboardDialog"
            :dialog="showOnboardDialog"
            @close="showOnboardDialog = false"
          />
          <v-btn
            v-if="$vuetify.breakpoint.xs"
            fixed
            fab
            bottom
            right
            color="blue"
            @click.stop="showComposeJamDialog = true"
            ><v-icon color="white">mdi-feather</v-icon>
          </v-btn>
          <ComposeJamDialog
            :dialog="showComposeJamDialog"
            @close="showComposeJamDialog = false"
          />
        </v-container>
      </v-col>

      <v-col
        v-if="$vuetify.breakpoint.mdAndUp"
        class="pt-0"
        style="max-width: 320px"
      >
        <searchBar />
      </v-col>
      <messagesOverlay />
    </v-row>
  </v-col>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { mapActions, mapGetters } from 'vuex'
import Tweet from '~/components/tweet'
// import Jam from '~/components/Jam'
import ComposeJam from '~/components/ComposeJam'
import ComposeJamDialog from '~/components/ComposeJamDialog'
import OnboardDialog from '~/components/profile/onboarding/OnboardDialog'
import searchBar from '~/components/searchBar'
import navbarMobile from '~/components/menu/navbarMobile'
import messagesOverlay from '~/components/messages/messagesOverlay'

export default {
  components: {
    navbarMobile,
    searchBar,
    Tweet,
    ComposeJam,
    ComposeJamDialog,
    OnboardDialog,
    messagesOverlay,
  },
  data() {
    return {
      showComposeJamDialog: false,
      togglemenu: false,
      showOnboardDialog: false,
      items: [
        {
          icon: 'mdi-campfire',
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
    }
  },
  computed: {
    ...mapGetters(['getJams', 'getProfile', 'getMyContactList', 'badgeCount']),
  },
  async created() {
    this.showOnboardDialog =
      !this.$store.state.users[this.$store.state.name.label.toLowerCase()] && // No userprofile cached
      !this.$store.state.presentedOnboarding

    if (this.showOnboardDialog)
      this.$store.commit('setPresentedOnboarding', true)

    this.fetchBookmarks()
    await this.fetchJams({
      view: '/discover',
      orderBy: [['$createdAt', 'desc']],
    })
  },
  methods: {
    ...mapActions([
      'fetchJams',
      'refreshLikesInState',
      'refreshCommentCountInState',
      'fetchBookmarks',
    ]),
  },
}
</script>

<style scoped>
.font-header {
  color: rgba(20, 23, 26, 0.8) !important;
  font-size: 20px;
  font-weight: bold;
  font-family: 'Montserrat';
}
.font-navdrawer {
  color: rgba(20, 23, 26, 0.8) !important;
  font-family: 'Montserrat';
  font-size: 16px;
}
</style>
