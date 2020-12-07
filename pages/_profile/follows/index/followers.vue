<template>
  <div>
    <v-card
      v-for="(name, i) in userFollowers"
      :key="i"
      tile=""
      elevation="0"
      class="tweetcard bottomborder"
    >
      <nuxt-link
        :to="'/' + name.label"
        style="text-decoration: none; color: inherit"
      >
        <v-list-item three-line>
          <v-list-item-avatar
            color="lightgray"
            size="49"
            style="margin-right: 8px; margin-top: 12px"
          >
            <v-img :src="getProfile(name.label).avatar"></v-img>
          </v-list-item-avatar>
          <v-list-item-content
            class="d-inline-block text-nowrap"
            style="max-width: 600px"
          >
            <v-list-item-title
              style="font-weight: bold"
              class="username truncate"
            >
              {{ name.label }}
            </v-list-item-title>
            <v-list-item-subtitle style="color: gray">
              @{{ name.label }}
            </v-list-item-subtitle>
            <v-list-item-subtitle
              style="
                padding-top: 8px;
                color: rgb(22, 21, 21, 0.8);
                font-size: 15px;
              "
            >
              {{ getProfile(name.label).statusMessage }}
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </nuxt-link>
      <v-btn
        fab
        top
        small
        dense
        icon
        absolute
        right
        color="#008de4"
        class="mt-7"
      >
        <!-- :disabled="!$store.getters.hasSession" -->
        <v-icon @click.stop="follow(name)"
          >{{
            getiFollow(name.$id)
              ? 'mdi-account-plus'
              : 'mdi-account-plus-outline'
          }}
        </v-icon>
      </v-btn>
      <div v-if="isLoading" class="mt-8 text-center">
        <v-progress-circular
          color="#008de4"
          size="22"
          width="3"
          indeterminate
        />
      </div>
    </v-card>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

export default {
  data() {
    return {
      userName: '',
      userId: '',
      isLoading: false,
      userFollowers: [],
    }
  },
  computed: {
    ...mapGetters(['getUserFollowers', 'getiFollow', 'getProfile']),
  },
  async created() {
    this.userName = this.$route.params.profile
    try {
      this.isLoading = true
      this.userId = (await this.resolveUsername(this.userName)).$id
      await this.fetchFollows({
        followType: 'followers',
        userId: this.userId,
        userName: this.userName,
      })
      const userFollowersPromises = this.getUserFollowers(this.userName).map(
        (uid) => {
          return this.resolveUserId(uid)
        }
      )
      this.userFollowers = await Promise.all(userFollowersPromises)

      this.userFollowers.map((x) => {
        return this.fetchProfile(x.normalizedLabel)
      })
    } catch (e) {
      console.error(e)
    } finally {
      this.isLoading = false
    }
  },
  methods: {
    ...mapActions([
      'fetchProfile',
      'fetchFollows',
      'resolveUsername',
      'resolveUserId',
      'followJammer',
      'showSnackbar',
    ]),
    async follow(dpnsUser) {
      const isFollowing = !this.getiFollow(dpnsUser.$id)
      console.log('isFollowing :>> ', isFollowing)
      await this.showSnackbar({
        // text: `You are now following {jammerId}`,
        text: `Following: ${isFollowing}`,
        color: '#008de4',
      })
      await this.followJammer({
        jammerId: dpnsUser.$id,
        userName: dpnsUser.label, // FIXME jammerId should go with jammerName, not userName
        isFollowing,
      })
      this.$forceUpdate()
    },
  },
}
</script>

<style scoped>
.bottomborder {
  border-bottom: 1px solid;
  border-color: #e2dfdfd8;
}
.username {
  text-decoration: none;
}
.username:hover {
  text-decoration: underline;
}
</style>
