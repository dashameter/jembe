<template>
  <div
    class="d-flex flex-column flex-grow-1"
    :class="{
      fullscreen: $vuetify.breakpoint.mdAndUp,
      halfscreen: $vuetify.breakpoint.smAndDown,
      mobile: $vuetify.breakpoint.xs,
    }"
  >
    <v-row
      v-if="$route.name === 'messages-userName'"
      align="center"
      no-gutters
      class="py-2"
      style="height: 52px; width: 100%"
    >
      <v-btn icon color="#008de4" @click="$router.push({ name: 'discover' })"
        ><v-icon>mdi-arrow-left</v-icon></v-btn
      >
      <span class="font-header pl-2"> Messages </span>
    </v-row>
    <v-divider />
    <v-row
      v-if="$route.name === 'messages-userName'"
      no-gutters
      justify="center"
      align="center"
      class="pt-0 pl-2 pb-0"
    >
      <messagesContactlistSearch />
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
        class="my-0 mx-auto messagecard"
        elevation="0"
        tile
        nuxt
        @click="selectChatPartner(chatPartnerUserName(entry[1]))"
      >
        <v-list-item two-line>
          <nuxt-link :to="'/' + chatPartnerUserName(entry[1])">
            <v-badge
              :content="
                getUnreadDirectMessageCountByChatPartnerUserName(
                  chatPartnerUserName(entry[1])
                )
              "
              :value="
                getUnreadDirectMessageCountByChatPartnerUserName(
                  chatPartnerUserName(entry[1])
                )
              "
              color="red"
              overlap
              style="top: 10px; right: 18px"
            >
              <v-list-item-avatar
                style="margin-top: 0px; margin-right: -5px"
                color="lightgray"
                size="48"
              >
                <v-img
                  class="elevation-6"
                  :src="getProfile(chatPartnerUserName(entry[1])).avatar"
                ></v-img>
              </v-list-item-avatar>
            </v-badge>
          </nuxt-link>
          <v-list-item-content
            class="d-inline-block text-nowrap"
            style="max-width: 600px"
          >
            <v-list-item-title>
              <span style="font-weight: bold" class="truncate">
                {{ chatPartnerUserName(entry[1]) }}
              </span>
              <span class="truncate" style="color: #787878">
                @{{ chatPartnerUserName(entry[1]) }}
              </span>
              <span class="time-posted" style="float: right">
                {{ getUserSignupTime(chatPartnerUserName(entry[1])) }}
              </span>
            </v-list-item-title>
            <v-list-item-subtitle>
              <div
                v-linkify="getLastPartnerMessage(chatPartnerUserName(entry[1]))"
              />
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </v-card>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import messagesContactlistSearch from '~/components/messages/messagesContactlistSearch'

export default {
  components: { messagesContactlistSearch },
  data() {
    return {}
  },
  computed: {
    ...mapGetters([
      'getLastPartnerMessage',
      'getProfile',
      'getMyContactList',
      'getUserSignupTime',
      'getUnreadDirectMessageCountByChatPartnerUserName',
    ]),
  },
  created() {
    console.log('route', this.$route)
    this.getMyContactList.forEach((entry) => {
      const userName = this.chatPartnerUserName(entry[1])
      this.fetchUserInfo({ userName })
    })
    console.log('this.getMyContactList :>> ', this.getMyContactList)
  },
  mounted() {},
  methods: {
    ...mapActions(['fetchContactlist', 'fetchUserInfo']),
    selectChatPartner(name) {
      if (this.$route.name === 'messages-userName') {
        this.$router.push('/messages/' + name)
      } else {
        this.$emit('chatpartnerselected', name)
      }
    },
    chatPartnerUserName(contact) {
      if (
        contact.senderUserName.toLowerCase() ===
        this.$store.state.name.label.toLowerCase()
      )
        return contact.receiverUserName
      else return contact.senderUserName
    },
    chatPartnerUserId(contact) {
      console.log('contact :>> ', contact)
      if (
        contact.senderUserName.toLowerCase() ===
        this.$store.state.name.label.toLowerCase()
      )
        return contact.receiverUserId
      else return contact.senderUserId
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
  border-top: solid !important;
  border-bottom: solid !important;
  border-color: #e2dfdfd8 !important;
  border-width: 1px !important;
}
.tweetcard:hover {
  background-color: #f5f8fb !important;
}
</style>

<style scoped>
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
}
.wide {
  max-width: 275px;
}
.narrowscreen {
  padding-right: 20px;
}
.widescreen {
  padding-right: 25px;
}
.font-searchbar {
  font-size: 15px;
  font-family: 'Arial';
  display: inline;
  line-height: 1.3125;
  background: #03619c !important;
}
</style>
