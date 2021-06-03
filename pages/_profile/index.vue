<template>
  <v-col
    class="flex-nowrap"
    justify="center"
    :class="{
      fullscreen: $vuetify.breakpoint.mdAndUp,
      halfscreen: $vuetify.breakpoint.smAndDown,
    }"
  >
    <v-row justify="center" no-gutters>
      <v-col class="flex-nowrap pt-2" style="max-width: 600px">
        <v-container class="pa-0 borders pt-0" style="height: 100vh">
          <v-row align="center" no-gutters>
            <v-btn
              class="pl-2"
              icon
              color="#008de4"
              @click="$router.push({ path: '../discover' })"
              ><v-icon>mdi-arrow-left</v-icon></v-btn
            >
            <span class="font-header pl-3">
              {{
                getProfile(jamUser).displayName
                  ? getProfile(jamUser).displayName
                  : jamUser
              }}
            </span>
            <span class="font-username pl-3"> @{{ jamUser }} </span>
          </v-row>
          <v-card flat tile class="my-2">
            <!-- <v-img :src="require('~/assets/avataaar.png')" height="194"></v-img> -->
            <v-img
              :src="getProfile(jamUser).theme"
              height="194"
              width="750"
            ></v-img>
            <v-avatar size="135" class="avatar" color="white">
              <v-img :src="getProfile(jamUser).avatar" alt="" />
            </v-avatar>
            <v-list-item>
              <v-list-item-content class="py-0">
                <v-list-item-title>
                  <span class="font-header">
                    {{
                      getProfile(jamUser).displayName
                        ? getProfile(jamUser).displayName
                        : jamUser
                    }}
                  </span>
                  <br />
                  <span class="font-username">@{{ jamUser }}</span>
                  <v-btn
                    v-if="
                      jamUser.toLowerCase() ===
                      $store.state.name.label.toLowerCase()
                    "
                    absolute
                    right
                    class="mb-1"
                    color="primary"
                    elevation="0"
                    outlined
                    dense
                    rounded
                    style="float: right"
                    @click="showOnboardDialog = true"
                    >{{ editProfileButtonText }}</v-btn
                  >
                  <v-btn
                    v-else
                    absolute
                    right
                    max-width="100px"
                    :loading="isFollowLoading"
                    dense
                    outlined
                    rounded
                    class="mt-n5 lowercase"
                    font-weight="bold"
                    style="color: #008de4"
                    :disabled="!$store.getters.isLoggedIn"
                    @click.stop="followByUsername()"
                    >{{ amIFollowingJammer ? 'Following' : 'Follow' }}
                  </v-btn>
                </v-list-item-title>
                <v-list-item-subtitle>{{
                  getProfile(jamUser).statusMessage
                }}</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>

            <v-card-text class="subtitle-1">
              <p>
                <v-icon>mdi-calendar-month</v-icon> Joined
                {{ getUserSignupTime(jamUser) }}
              </p>
              <p class="follow">
                <nuxt-link :to="'/' + jamUser + '/follows/following'">
                  <span
                    style="font-weight: bold; color: black"
                    class="follow"
                    >{{ getUserFollowingCount(jammerId) }}</span
                  >
                  Following
                </nuxt-link>
                <nuxt-link :to="'/' + jamUser + '/follows/followers'">
                  <span
                    style="font-weight: bold; color: black"
                    class="ml-2 follow"
                    >{{ getUserFollowersCount(jammerId) }}</span
                  >
                  Followers
                </nuxt-link>
              </p>
            </v-card-text>
          </v-card>

          <!-- mobile-breakpoint="640px" -->
          <v-tabs fixed-tabs="" show-arrows="" @change="refreshTab($event)">
            <v-tabs-slider color="teal lighten-3"></v-tabs-slider>
            <v-tab exact :to="`/${jamUser}`"> Jams </v-tab>
            <v-tab exact :to="`/${jamUser}/with_replies`"
              ><span style="white-space: nowrap"> Jams & Replies</span>
            </v-tab>
            <!-- <v-tab :to="`/${jamUser}/following`"> Following </v-tab>
            <v-tab :to="`/${jamUser}/followers`"> Followers </v-tab> -->
            <v-tab disabled :to="`/${jamUser}/media`"> Media </v-tab>
            <v-tab :to="`/${jamUser}/likes`"> Likes </v-tab>
            <!-- <v-tab-item>
          <JamsByUser :key="tabRefresh" :show-replies="false" />
        </v-tab-item>
        <v-tab-item> </v-tab-item>
        <v-tab-item>
          <v-card flat tile>
            <v-container fluid style="maxwidth: 600px; display: flex;">
              <Usercard is-followed />
            </v-container>
          </v-card>
        </v-tab-item>
        <v-tab-item>
          <Jam is-liked />
        </v-tab-item> -->
          </v-tabs>
          <JamsByUser v-if="$route.name === 'profile'" :show-replies="false" />
          <nuxt-child />
          <OnboardDialog
            v-if="showOnboardDialog"
            :dialog="showOnboardDialog"
            @close="showOnboardDialog = false"
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
    </v-row>
  </v-col>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

import Usercard from '~/components/usercard'
import JamsByUser from '~/components/profile/JamsByUser'
import OnboardDialog from '~/components/profile/onboarding/OnboardDialog'
import searchBar from '~/components/searchBar'

// const timestamp = () => Math.floor(Date.now())

export default {
  // eslint-disable-next-line vue/no-unused-components
  components: { searchBar, JamsByUser, Usercard, OnboardDialog },
  data() {
    return {
      showOnboardDialog: false,
      amIFollowingJammer: false,
      isFollowLoading: false,
      jammerId: undefined,
      jamUser: '',
      tabRefresh: 0,
      profile: {},
    }
  },
  computed: {
    ...mapGetters([
      'getProfile',
      'getUserSignupTime',
      'getUserFollowingCount',
      'getUserFollowersCount',
    ]),
    editProfileButtonText() {
      return this.getProfile(this.$store.state.name.label).statusMessage
        ? 'Edit Profile'
        : 'Setup Profile'
    },
  },
  async created() {
    this.jamUser = this.$route.params.profile
    const dpnsUser = await this.resolveUsername(this.jamUser)

    console.log('profile dpnsUser :>> ', dpnsUser)

    if (dpnsUser) {
      this.jammerId = dpnsUser.$ownerId
      this.amIFollowingJammer = this.$store.getters.getiFollow(this.jammerId)

      this.fetchUserInfo({ userName: this.jamUser, forceRefresh: true })
    }
  },
  methods: {
    ...mapActions([
      'queryDocuments',
      'submitDocument',
      'fetchUserInfo',
      'resolveUsername',
      'followJammer',
      'showSnackbar',
    ]),
    refreshTab(number) {
      this.tabRefresh += 1
    },
    async followByUsername() {
      this.isFollowLoading = true
      await this.followJammer({
        jammerId: this.jammerId,
        userName: this.jamUser,
        isFollowing: !this.amIFollowingJammer,
      })
      this.isFollowLoading = false
      this.amIFollowingJammer = !this.amIFollowingJammer
      this.$forceUpdate()
      if (this.amIFollowingJammer === true) {
        this.showSnackbar({
          text: `You are following: ${this.jamUser}`,
          color: '#008de4',
        })
      } else if (this.amIFollowingJammer === false) {
        this.showSnackbar({
          text: `You stopped following: ${this.jamUser}`,
          color: '#008de4',
        })
      }
    },
  },
}
</script>

<style scoped>
.avatar {
  margin-top: -100px;
  margin-left: 10px;
  border: white;
  border-style: solid;
  border-width: 4px;
}
.font-header {
  color: rgba(20, 23, 26, 0.8) !important;
  font-size: 20px;
  font-weight: bold;
  font-family: 'Montserrat';
}
/* .follow-links {
  max-height: 15px !important;
  height: 15px !important;
  padding-top: 10px;
  padding-bottom: 10px;
} */
.follow a {
  text-decoration: none !important;
  color: #787878 !important;
  /* color: rgba(0, 0, 0, 0.601); */
}
.follow a:hover {
  text-decoration: underline !important;
}
</style>
