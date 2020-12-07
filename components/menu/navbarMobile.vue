<template>
  <v-navigation-drawer :value="togglemenu" absolute temporary>
    <v-row justify="center" no-gutters>
      <v-list nav class="pr-0" justify="center" rounded>
        <nuxt-link :to="'/discover'">
          <v-list-item-avatar size="35px" @click="$router.push('/')">
            <v-img :src="require('~/assets/jembe-logo.png')" size="20px">
            </v-img>
          </v-list-item-avatar>
        </nuxt-link>
        <v-list-item
          v-for="item in items"
          :key="item.title"
          nuxt
          :to="item.to"
          exact
          exact-active-class="navdrawersidebar"
          class="pr-0"
        >
          <v-list-item-icon>
            <v-badge
              :content="badgeCount(item.to.substring(1))"
              :value="badgeCount(item.to.substring(1))"
              color="red"
              overlap
            >
              <v-icon class="menu-text" size="20px">{{ item.icon }}</v-icon>
            </v-badge>
          </v-list-item-icon>
          <v-list-item-title class="font-navdrawer" v-text="item.title"
            >{item.title}}
          </v-list-item-title>
        </v-list-item>
        <v-list-item class="" exact @click="logout()">
          <v-list-item-icon>
            <v-icon class="menu-text" style="margin-left: 2px" size="20px"
              >mdi-logout</v-icon
            >
          </v-list-item-icon>
          <v-list-item-title class="font-navdrawer">Logout </v-list-item-title>
        </v-list-item>
        <ComposeJamDialog
          :dialog="showComposeJamDialog"
          @close="showComposeJamDialog = false"
        />
        <v-list-item>
          <v-btn
            class="ml-n2"
            rounded
            fab
            dark
            color="#008de4"
            height="42px"
            width="210px"
            style="font-size: 16px"
            @click.stop="showComposeJamDialog = true"
            @close="showComposeJamDialog = false"
          >
            Post Jam
            <v-icon size="20px" color="white">mdi-feather</v-icon>
          </v-btn>
        </v-list-item>
      </v-list>
    </v-row>
  </v-navigation-drawer>
</template>

<script>
import { mapGetters } from 'vuex'
import ComposeJamDialog from '~/components/ComposeJamDialog'

export default {
  components: { ComposeJamDialog },
  props: {
    togglemenu: Boolean,
  },
  data() {
    return {
      showComposeJamDialog: false,
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
    }
  },
  computed: {
    ...mapGetters(['badgeCount']),
  },
}
</script>

<style scoped>
.navdrawersidebar {
  color: #8cc0e0;
  font: black;
}
</style>
