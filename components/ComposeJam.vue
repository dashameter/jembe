<template>
  <div>
    <!-- <v-card class="pa-4 mx-auto" max-width="600" elevation="0" tile> -->
    <v-row no-gutters>
      <v-col style="max-width: 65px" class="pl-4 pt-2">
        <v-avatar color="lightgray">
          <v-img :src="getProfile(myUserName).avatar"></v-img> </v-avatar
      ></v-col>
      <v-col class="px-0">
        <Mentionable
          :keys="['@']"
          :items="items"
          offset="6"
          insert-space
          placement="auto"
          @open="loadMentions()"
          @search="loadMentions($event)"
        >
          <textarea
            v-model="jamText"
            :disabled="isLoading"
            :class="{ error: jamText.length > 280 }"
            rows="6"
            class="jamtextinput"
            placeholder="Share what matters.."
            style="font-size: 16px; font-family: Roboto; line-height: 22px"
            @keyup="validateText()"
          />
          <template #no-result>
            <div class="noresult dim">
              {{ loading ? 'Loading...' : 'No result' }}
            </div>
          </template>

          <template #item-@="{ item }" class="items">
            <div class="item">
              <span class="label"> @{{ item.label }} </span>
              <span class="dim">
                {{ item.value }}
              </span>
            </div>
          </template>
        </Mentionable>
        <v-card
          elevation="6"
          :style="{
            position: 'absolute',
            background: 'white',
            'z-index': 999999999,
          }"
        >
          <Picker
            v-if="showEmojiPicker"
            v-click-outside="closeEmojiPicker"
            color="#008de4"
            set="twitter"
            title="Pick your emoji"
            emoji="point_up"
            @select="addEmoji"
          />
        </v-card>
      </v-col>
    </v-row>
    <v-card-actions>
      <v-btn class="ml-15" icon @click="showEmojiPicker = !showEmojiPicker">
        <v-icon color="#008de4">mdi-emoticon-happy-outline </v-icon>
      </v-btn>
      <v-spacer />
      <v-progress-circular
        size="30"
        rotate="-90"
        :value="textValid.value"
        :color="textValid.color"
        :width="textValid.width"
        >{{ textValid.number }}</v-progress-circular
      >
      <v-divider class="mx-4" vertical></v-divider>

      <v-btn
        :loading="isLoading"
        rounded
        color="#008de4"
        elevation="0"
        :dark="textValid.isValid"
        :disabled="!textValid.isValid"
        @click.prevent="postJam(jamText)"
        >Jam this</v-btn
      >
    </v-card-actions>
    <v-divider />
  </div>
  <!-- </v-card> -->
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { mapActions, mapGetters } from 'vuex'
import { Mentionable } from 'vue-mention'
import { Picker } from 'emoji-mart-vue'

export default {
  components: {
    Mentionable,
    Picker,
  },
  props: { replyToJamId: { type: String, default: '' } },
  data() {
    return {
      showEmojiPicker: false,
      items: [],
      loading: false,
      isLoading: false,
      jamText: '',
      textValid: {
        number: '',
        color: 'primary',
        value: 0,
        width: 2,
        backgroundcolor: 'white',
        isValid: false,
      },
    }
  },
  computed: { ...mapGetters(['getProfile', 'myUserName']) },
  methods: {
    ...mapActions(['sendJamAndRefreshJams', 'searchDashNames']),
    closeEmojiPicker() {
      this.showEmojiPicker = false
    },
    addEmoji(event) {
      this.jamText = this.jamText + event.colons
      this.validateText()
    },
    async loadMentions(searchText = null) {
      if (!searchText) return

      this.loading = true
      this.items = (await this.searchDashNames(searchText)).map((n) => {
        return { value: n.toJSON().label, label: n.toJSON().label }
      })
      // console.log('search this.items :>> ', this.items)
      this.loading = false
    },
    async postJam() {
      this.isLoading = true
      await this.sendJamAndRefreshJams({
        view: this.$route.path,
        jamText: this.jamText,
        replyToJamId: this.replyToJamId,
        reJamId: '',
      })
      this.isLoading = false
      this.jamText = ''
      this.validateText() // reset ui elements
      this.$emit('success')
    },

    validateText() {
      //   console.log({ event })
      //   console.log(event.srcElement.textLength)

      const { textValid } = this
      // const amountChars = event.srcElement.textLength
      const amountChars = this.jamText.length
      const allowedChars = 280 // TODO maybe enforce in contract, consider how to handle not counting URL length
      const remainingChars = allowedChars - amountChars

      textValid.value = (amountChars / allowedChars) * 100

      // console.log({ remainingChars })
      if (remainingChars >= 20) {
        this.textValid.color = 'primary'
        this.textValid.number = ''
      }
      if (remainingChars < 21) {
        this.textValid.color = 'amber'
        this.textValid.number = remainingChars
      }
      if (remainingChars < 0) {
        this.textValid.color = 'red'
        this.textValid.backgroundcolor = '#ff000033'
        this.textValid.number = remainingChars
        this.textValid.isValid = false
      } else {
        this.textValid.isValid = true
        this.textValid.backgroundcolor = 'white'
      }

      // Hide circle if text is 3 chars long (incl sign)
      if (remainingChars < -9) {
        this.textValid.width = 0
      } else {
        this.textValid.width = 2
      }
    },
  },
}
</script>
<style scope>
.error {
  background-color: #f5d1cc;
}
textarea {
  border: none;
  overflow: auto;
  outline: none;

  -webkit-box-shadow: none;
  -moz-box-shadow: none;
  box-shadow: none;
}
.jamtextinput {
  width: 100%;
  border: none;
  border-radius: 4px;
  resize: none;
  min-height: 42px;
  line-height: 28px;
  font-size: 16px;
  padding: 8px;

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  margin-top: 10px;
}
.popover {
  z-index: 999999999999;
}
.item {
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  background-color: white;
  padding: 6px;
}

.mention-selected .item {
  background-color: #6bc6ff;
}

.item .label {
  font-family: monospace;
}

.dim {
  color: #666;
}

.noresult {
  background-color: #ffa9a9 !important;
  border-radius: 4px;
  padding: 8px;
}
</style>
