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
              @click="$router.push({ name: 'profile' })"
              ><v-icon>mdi-arrow-left</v-icon></v-btn
            >
            <span>
              <v-list-item two-line>
                <v-list-item-content>
                  <v-list-item-title
                    style="font-weight: 800px; font-size: 19px"
                  >
                    {{ jamUser }}
                  </v-list-item-title>
                  <v-list-item-subtitle> @{{ jamUser }} </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </span>
          </v-row>

          <v-tabs fixed-tabs="" @change="refreshTab($event)">
            <v-tab :to="`/${jamUser}/follows/following`"> Following </v-tab>
            <v-tab :to="`/${jamUser}/follows/followers`"> Followers </v-tab>
          </v-tabs>
          <!-- <following v-if="$route.name === 'profile/follows'" /> -->
          <nuxt-child /> </v-container
      ></v-col>
      <v-col
        v-if="$vuetify.breakpoint.mdAndUp"
        class="pt-0"
        style="max-width: 320px"
      >
        <searchBar />
      </v-col> </v-row
  ></v-col>
</template>

<script>
import searchBar from '~/components/searchBar'

export default {
  components: { searchBar },
  data() {
    return { jamUser: '', tabRefresh: 0 }
  },
  created() {
    this.jamUser = this.$route.params.profile
  },
  methods: {
    refreshTab(number) {
      this.tabRefresh += 1
    },
  },
}
</script>
