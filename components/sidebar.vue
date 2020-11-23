<template>
  <div>
    <v-row justify="end">
      <v-list rounded max-width="275px">
        <v-list-item-avatar class="ml-1">
          <v-badge
            :content="badgeCount(item.to.substring(1))"
            :value="badgeCount(item.to.substring(1))"
            color="red"
            overlap
          >
            <v-img :src="require('~/assets/jembe-logo.png')"> </v-img>
          </v-badge>
        </v-list-item-avatar>
        <v-list-item
          v-for="item in items"
          v-show="$vuetify.breakpoint.smAndUp"
          :key="item.title"
          nuxt
          :to="item.to"
          class="menu-background"
          :class="{
            narrow: $vuetify.breakpoint.mdAndDown,
            wide: $vuetify.breakpoint.mdAndUp,
          }"
        >
          <v-list-item-icon>
            <v-badge
              :content="badgeCount(item.to.substring(1))"
              :value="badgeCount(item.to.substring(1))"
              color="red"
              overlap
            >
              <v-icon class="menu-text" size="30px">{{ item.icon }}</v-icon>
            </v-badge></v-list-item-icon
          >
          <v-list-item-title
            v-show="$vuetify.breakpoint.mdAndUp"
            class="menu-text font-sidebar"
            v-text="item.title"
            >{{ item.title }}
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
              justify="end"
              class="menu-text"
              size="30px"
              color="dark gray"
              >mdi-logout</v-icon
            >
          </v-list-item-icon>
          <v-list-item-title
            v-show="$vuetify.breakpoint.mdAndUp"
            class="menu-text font-sidebar menu-text"
            >Logout
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-row>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  data() {
    // State change to LoggedOut
    if (!this.$store.getters.hasSession && !this.isIndexRoute) {
      this.logout()
    }
    return {
      items: [
        {
          icon: 'mdi-home',
          title: 'Home',
          to: '/',
        },
        {
          icon: 'mdi-magnify',
          title: 'Explore',
          to: '/',
        },
        {
          icon: 'mdi-bell',
          title: 'Notifications',
          to: '/',
        },
        {
          icon: 'mdi-email-outline',
          title: 'Messages',
          to: '/',
        },
        {
          icon: 'mdi-bookmark',
          title: 'Bookmarks',
          to: '/',
        },
        {
          icon: 'mdi-account',
          title: 'Users',
          to: '/',
        },
      ],
      title: 'Jembe',
      drawer: false,
    }
  },
  computed: {
    ...mapGetters(['badgeCount']),
  },
}
</script>
