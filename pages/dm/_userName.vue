<template>
  <v-col>
    Messages:
    {{ $route.params.userName }}
    <v-list>
      <v-list-item
        v-for="(message, idx) in $store.getters.getDirectMessages(
          chatPartnerUserId
        )"
        :key="idx"
      >
        <v-row
          :justify="
            message.senderUserId === $store.state.name.userId ? 'end' : 'start'
          "
        >
          <span> {{ message.encMessage }}</span>
          <span class="text-overline">
            {{ message.isSending ? 'sending' : '' }}</span
          >
        </v-row>
      </v-list-item>
    </v-list>
    <v-divider />
    <v-text-field
      v-model="directMessageText"
      :disabled="isSendingReplyMessage"
    /><v-btn
      :loading="isSendingReplyMessage"
      @click="
        sendDirectMessageWrapper({ directMessageText, chatPartnerUserId })
      "
      >Send</v-btn
    >
    <!-- @click="sendDirectMessage({ directMessageText, chatPartnerUserId })" -->
  </v-col>
</template>

<script>
import { mapActions } from 'vuex'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default {
  data() {
    return {
      isSendingReplyMessage: false,
      messages: [],
      directMessageText: '',
      lastTimeCheckedReceived: 0,
      lastTimeCheckedSent: 0,
      chatPartnerUserName: undefined,
      chatPartnerUserId: '',
    }
  },
  async created() {
    this.chatPartnerUserName = this.$route.params.userName

    // TODO show snack error / redirect if user isn't signed up to jembe
    this.chatPartnerUserId = (
      await this.resolveUsername(this.chatPartnerUserName)
    ).$id

    this.fetchDirectMessages()
  },
  methods: {
    ...mapActions([
      'fetchDirectMessages',
      'resolveUsername',
      'sendDirectMessage',
    ]),
    sendDirectMessageWrapper({ directMessageText, chatPartnerUserId }) {
      // this.isSendingReplyMessage = true
      this.directMessageText = ''
      this.sendDirectMessage({ directMessageText, chatPartnerUserId })
      // this.isSendingReplyMessage = false
    },
    async fetchMessagesLoop() {
      await this.fetchMessages()

      await sleep(1000)

      this.fetchMessagesLoop()
    },
  },
}
</script>

<style>
.full {
  max-width: 975px;
}
.half {
  max-width: 600px;
}
</style>
