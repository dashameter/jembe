<template>
  <div
    style="height: 100vh"
    class="d-flex flex-column flex-grow-1"
    :class="{
      fullscreen: $vuetify.breakpoint.mdAndUp,
      halfscreen: $vuetify.breakpoint.smAndDown,
    }"
  >
    <!-- insert avatar and navbar -->
    <!-- consider making own component -->
    <!-- <v-row
          v-if="$vuetify.breakpoint.xs"
          class="pl-2 pb-1"
          align="center"
          no-gutters
        > -->
    <v-row
      align="center"
      no-gutters
      class="headerbar py-2"
      style="height: 52px"
    >
      <v-btn icon color="#008de4" @click="$router.go(-1)"
        ><v-icon>mdi-arrow-left</v-icon></v-btn
      >
      <span class="font-header pl-2"> Messages </span>
    </v-row>
    <v-divider />
    <v-row no-gutters justify="center" align="middle" class="pt-0 pl-2 pb-0">
      <!-- <v-text-field
        width="600px"
        flat
        rounded
        filled
        color="#008de4"
        dense
        prepend-inner-icon="mdi-magnify"
        class="pt-4 pr-4 pl-4 pb-0"
      >
      </v-text-field> -->
      <messagesContactlistSearch />
      <!-- <searchBarMessages /> -->
      <!-- :search-bar-width="$vuetify.breakpoint.mdAndUp ? '600px' : '600px'" -->
    </v-row>
    <v-divider />

    <div
      id="scrollcontainer"
      style="height: 100%; overflow-y: scroll; flex-shrink: 1"
    >
      <v-card
        v-for="(entry, idx) in getMyContactList"
        :key="idx"
        :ripple="false"
        :to="'/messages/' + chatPartnerName(entry[1])"
        class="my-0 mx-auto messagecard"
        elevation="0"
        tile
        nuxt
      >
        <!-- use nuxt & :to="method" >> write a method that retrieves the messagesChat for that contactid -->
        <v-list-item two-line>
          <!-- <v-for to loop through each of the chats> -->
          <!-- each card will link to its corresponding chat based on the _username: route.params.username -->
          <!-- <v-row justify="start" no-gutters="" style="max-height: 50px"> -->
          <nuxt-link :to="'/' + chatPartnerName(entry[1])">
            <v-list-item-avatar
              style="margin-top: 13px"
              color="lightgray"
              size="48"
            >
              <v-img
                class="elevation-6"
                :src="getProfile(chatPartnerName(entry[1])).avatar"
              ></v-img> </v-list-item-avatar
          ></nuxt-link>
          <v-list-item-content
            class="d-inline-block text-nowrap"
            style="max-width: 600px"
          >
            <v-list-item-title>
              <span style="font-weight: bold" class="truncate">
                {{ chatPartnerName(entry[1]) }}
              </span>
              @{{ chatPartnerName(entry[1]) }}
              <!-- {{ $route.params.username }} -->
              <span class="time-posted" style="float: right">
                <!-- {{ posted(1579500000000) }} -->
                {{ getUserSignupTime(chatPartnerName(entry[1])) }}
              </span>
            </v-list-item-title>
            <v-list-item-subtitle>
              Write me something, I'm happy to chat.
              <!-- last message text truncate at width = . also consider reactions
            "User reacted with ;~)" -->
            </v-list-item-subtitle>
          </v-list-item-content>
          <!-- </v-row> -->
        </v-list-item>
      </v-card>
    </div>
  </div>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { mapActions, mapGetters } from 'vuex'
import messagesContactlistSearch from '~/components//messages/messagesContactlistSearch'
// import messagesChat from '~/components//messages/messagesChat'
// import searchBarMessages from '~/components/searchBarMessages'
// import ComposeJam from '~/components/ComposeJam'
// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default {
  components: { messagesContactlistSearch },
  data() {
    return {}
  },
  computed: {
    ...mapGetters(['getProfile', 'getMyContactList', 'getUserSignupTime']),
  },
  async created() {
    await this.fetchContactlist({ userId: this.$store.state.name.userId })
    this.getMyContactList.forEach((entry) => {
      const userName = this.chatPartnerName(entry[1])
      this.fetchUserInfo({ userName })
    })
    console.log('this.getMyContactList :>> ', this.getMyContactList)
  },
  mounted() {},
  methods: {
    ...mapActions(['fetchContactlist', 'fetchUserInfo']),
    chatPartnerName(contact) {
      console.log('contact :>> ', contact)
      if (
        contact.senderUserName.toLowerCase() ===
        this.$store.state.name.label.toLowerCase()
      )
        return contact.receiverUserName
      else return contact.senderUserName
    },
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
  },
}
</script>

<style>
/* TODO clean up style */
* {
  text-transform: none !important;
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
.messagecard {
  /* border-left: none; */
  /* border-right: none; */
  border-top: solid !important;
  border-bottom: solid !important;
  border-color: #e2dfdfd8 !important;
  border-width: 1px !important;
  /* border-color: #ece7e7d8; made border color lighter since the top and bottom borders overlap and become darker */
}
.tweetcard:hover {
  background-color: #f5f8fb !important;
}
</style>

<style scoped>
/* TODO clean up style */
.truncate {
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.borders {
  max-width: 600px;
  border-left: solid;
  border-right: solid;
  border-color: #e2dfdfd8;
  border-width: 1px;
}
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
  padding-right: 20px;
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
