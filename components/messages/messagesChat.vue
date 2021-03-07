<template>
  <div
    class="d-flex flex-column flex-grow-1"
    :class="{
      fullscreen: $vuetify.breakpoint.mdAndUp,
      halfscreen: $vuetify.breakpoint.smAndDown,
      mobile: $vuetify.breakpoint.xs,
      chatoverlay: $route.name === 'discover',
      messagestab: $route.name === 'messages-userName',
    }"
  >
    <v-row
      v-if="$route.name === 'messages-userName'"
      align="center"
      no-gutters
      class="pl-3 pt-0 pb-0"
      style="height: 52px"
    >
      <v-btn
        v-if="$vuetify.breakpoint.smAndDown"
        icon
        color="#008de4"
        class="mt-n1"
        @click="$router.push('/messages')"
        ><v-icon>mdi-arrow-left</v-icon></v-btn
      >
      <span class="font-header pa-0 mt-n1">
        <v-list-item two-line>
          <nuxt-link :to="'/' + 'drummer'">
            <v-list-item-avatar color="lightgray" size="31" class="mr-2">
              <v-img
                class="elevation-6"
                :src="getProfile(chatPartnerUserName).avatar"
              ></v-img> </v-list-item-avatar
          ></nuxt-link>
          <v-list-item-content class="py-2">
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
    </v-row>
    <v-divider />
    <div
      id="scrollcontainer"
      class="mb-2"
      style="
        overflow-y: scroll;
        flex-shrink: 1;
        flex-direction: column-reverse;
        display: flex;
      "
      :class="{
        messagesheight: $route.name === 'messages-userName',
        overlayheight: $route.name === 'discover',
      }"
    >
      <div>
        <v-row
          v-for="(message, idx) in getDirectMessages(chatPartnerUserId)"
          :key="idx"
          no-gutters
          :justify="amIMessageSender(message) ? 'end' : 'start'"
        >
          <v-card
            class="mt-1 px-4 py-2 mr-4 ml-4"
            :class="{
              chatPartnerBubble: !amIMessageSender(message),
              meBubble: amIMessageSender(message),
            }"
            elevation="0"
            outlined
            color="lightgrey"
            style="
              line-height: 1.2em;
              font-size: 16px;
              display: flex !important;
              flex-direction: column;
              max-width: 350px;
            "
          >
            <div v-linkify="message.encMessage" />
          </v-card>
        </v-row>
      </div>
    </div>
    <v-row no-gutters align="center" class="flex-nowrap messageinput py-2">
      <v-btn class="ml-3" icon @click="showEmojiPicker = !showEmojiPicker">
        <v-icon color="#008de4">mdi-emoticon-happy-outline </v-icon>
      </v-btn>
      <Picker
        v-if="showEmojiPicker"
        v-click-outside="closeEmojiPicker"
        color="#008de4"
        set="twitter"
        title="Pick your emoji"
        emoji="point_up"
        :style="{
          position: 'fixed',
          bottom: 0,
          'margin-bottom': '56px',
          background: 'white',
          'z-index': 999999999,
        }"
        @select="addEmoji"
      />
      <v-text-field
        id="messageinput"
        v-model="directMessageText"
        aria-autocomplete="off"
        autocomplete="off"
        :disabled="isSendingReplyMessage"
        class="px-2"
        rounded
        filled
        dense
        placeholder="Start a new message"
        hide-details=""
        @keydown.enter="enterPress"
      />
      <v-btn
        :loading="isSendingReplyMessage"
        icon
        class="mr-1"
        @click="sendDirectMessageWrapper"
        ><v-icon color="#008de4"> mdi-send </v-icon>
      </v-btn>
    </v-row>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import * as linkify from 'linkifyjs'
import mention from 'linkifyjs/plugins/mention'
import hashtag from 'linkifyjs/plugins/hashtag'
import { Picker } from 'emoji-mart-vue'

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
mention(linkify)
hashtag(linkify)

export default {
  components: {
    Picker,
  },
  props: {
    chatPartnerUserName: { type: String, default: '' },
  },
  data() {
    return {
      showEmojiPicker: false,
      isSendingReplyMessage: false,
      directMessageText: '',
      lastTimeCheckedReceived: 0,
      lastTimeCheckedSent: 0,
      chatPartnerUserId: '',
      setLastSeenMsgInterval: undefined,
    }
  },
  computed: {
    ...mapGetters([
      'getJams',
      'getProfile',
      'getDirectMessages',
      'getLastPartnerMessageTime',
    ]),
  },
  watch: {
    getLastPartnerMessageTime(chatPartnerUserName) {
      console.log('chatPartnerUserName :>> ', chatPartnerUserName)
    },
  },
  async created() {
    if (this.chatPartnerUserName) {
      // TODO show snack error / redirect if user isn't signed up to jembe
      this.chatPartnerUserId = (
        await this.resolveUsername(this.chatPartnerUserName)
      ).$id
    }
    this.setLastSeenMsgInterval = setInterval(this.setLastSeenMsg, 2000)
  },
  beforeDestroy() {
    clearInterval(this.setLastSeenMsgInterval)
  },
  methods: {
    ...mapActions(['resolveUsername', 'sendDirectMessage']),
    closeEmojiPicker() {
      this.showEmojiPicker = false
    },
    addEmoji(event) {
      console.log('findingtest', this.directMessageText)
      if (this.directMessageText.endsWith(' ')) {
        this.directMessageText = this.directMessageText + event.colons + ' '
      } else {
        this.directMessageText =
          this.directMessageText + ' ' + event.colons + ' '
      }
      document.getElementById('messageinput').focus()
    },
    async setLastSeenMsg() {
      const prevTimestamp =
        this.$store.state.dappState.lastSeen[
          this.chatPartnerUserName.toLowerCase()
        ] || 0

      const lastIndex = this.$store.state.directMessage.dm.length - 1

      const newTimestamp = this.$store.state.directMessage.dm[lastIndex]
        ? this.$store.state.directMessage.dm[lastIndex].$createdAt
        : 0

      if (newTimestamp > prevTimestamp) {
        this.$store.commit('setLastSeenDirectMessage', {
          chatPartnerUserName: this.chatPartnerUserName,
          timestamp: newTimestamp,
        })

        await this.$store.dispatch('saveDappState')
      }
    },
    enterPress(event) {
      // TODO use text-area and add linebreaks to messages
      if (event.shiftKey === true) {
        this.directMessageText = this.directMessageText + '\n\r'
      } else {
        this.sendDirectMessageWrapper()
        this.closeEmojiPicker()
      }
    },
    amIMessageSender(message) {
      return message.senderUserId === this.$store.state.name.userId
    },
    sendDirectMessageWrapper() {
      const {
        directMessageText,
        chatPartnerUserName,
        chatPartnerUserId,
        sendDirectMessage,
      } = this

      // Don't send an empty message
      if (directMessageText === '') return

      this.directMessageText = ''

      sendDirectMessage({
        directMessageText,
        chatPartnerUserId,
        chatPartnerUserName,
      })
    },
  },
}
</script>

<style scoped>
a.linkify {
  color: #03619c !important;
  text-decoration: none !important;
}
a.linkify :hover {
  text-decoration: underline !important;
}

.messageinput {
  border-top: solid 1px;
  border-top-color: lightgray;
}
.chatPartnerBubble {
  background-color: #ece9e9;
  border-radius: 15px 15px 15px 0px;
  font-weight: 410;
  margin-left: 48px;
}
.meBubble {
  background-color: #008de4;
  color: white;
  border-radius: 15px 15px 0px 15px;
  font-weight: 410;
}
.messagesheight {
  height: 100%;
}
.overlayheight {
  height: 250px;
}
.chatoverlay {
  max-height: 470px;
}
</style>
