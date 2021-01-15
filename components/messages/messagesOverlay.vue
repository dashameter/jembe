<template>
  <div>
    <v-expansion-panels
      v-if="$vuetify.breakpoint.mdAndUp"
      class="overlay-style px-0"
    >
      <v-expansion-panel class="px-0 mx-0">
        <v-expansion-panel-header>
          <span v-if="!chatPartnerUserName" class="font-header px-6 py-4">
            Messages
          </span>
          <span v-if="chatPartnerUserName" class="font-header pa-0">
            <v-list-item two-line>
              <v-btn
                icon
                color="#008de4"
                @click.stop="chatPartnerUserName = null"
                ><v-icon>mdi-arrow-left</v-icon></v-btn
              >
              <v-list-item-content class="py-2 pl-3">
                <v-list-item-title>
                  <span style="font-weight: bold; font-size: 19px">
                    {{ chatPartnerUserName }}
                  </span>
                </v-list-item-title>
                <v-list-item-subtitle
                  style="color: #757575; font-size: 12px; margin-left: 1px"
                >
                  {{ `@${chatPartnerUserName}` }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </span>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <messagesContactlistSearch
            v-if="!chatPartnerUserName"
            class="px-5"
            @chatpartnerselected="setChatPartnerUserName"
          />
          <messagesChat
            v-if="chatPartnerUserName"
            :chat-partner-user-name="chatPartnerUserName"
            class="px-0"
            @back="chatPartnerUserName = null"
          >
            {{ chatPartnerUserName }}
          </messagesChat>
          <messagesContactlist
            class="pt-4"
            v-if="!chatPartnerUserName"
            @chatpartnerselected="setChatPartnerUserName"
          >
            {{ chatPartnerUserName }}
          </messagesContactlist>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { mapActions, mapGetters } from 'vuex'
import messagesChat from '~/components//messages/messagesChat'
import messagesContactlist from '~/components/messages/messagesContactlist'
import messagesContactlistSearch from '~/components/messages/messagesContactlistSearch'
// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default {
  components: {
    messagesContactlistSearch,
    messagesContactlist,
    messagesChat,
  },
  data() {
    return {
      chatPartnerUserName: null,
    }
  },
  MessagesContactlistdata() {
    return {
      chatPartnerUserName: null,
    }
  },
  computed: {
    ...mapGetters(['getProfile', 'getMyContactList', 'getUserSignupTime']),
  },
  async created() {
    await this.fetchContactlist({ userId: this.$store.state.name.userId })
    this.getMyContactList.forEach((entry) => {
      const userName = this.getChatPartnerUserName(entry[1])
      this.fetchUserInfo({ userName })
    })
    console.log('this.getMyContactList :>> ', this.getMyContactList)
  },
  mounted() {},
  methods: {
    ...mapActions(['fetchContactlist', 'fetchUserInfo']),
    setChatPartnerUserName(userName) {
      this.chatPartnerUserName = userName
      console.log('partnername', this.chatPartnerUserName)
    },
    getChatPartnerUserName(contact) {
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
  font-size: 20px !important;
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
.overlay-style {
  width: 400px;
  padding-left: 0px;
  padding-right: 0px;
  position: fixed;
  right: 0;
  bottom: 0;
  max-height: 530px;
  z-index: 1;
  min-width: 350px;
  max-width: 400px;
  margin-right: 20px;
  border-top-right-radius: 16px;
  border-top-left-radius: 16px;
  align-self: flex-end;
  box-sizing: border-box;
  /* flex-basis: auto; */
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0px;
  box-shadow: rgba(101, 119, 134, 0.2) 0px 0px 15px;
}
</style>
