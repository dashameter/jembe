<template>
  <v-dialog
    v-model="showDialog"
    max-width="600px"
    max-height="415px"
    box-shadow="0px"
    class="topdialog"
    :fullscreen="$vuetify.breakpoint.xs"
    @click:outside="close()"
  >
    <v-card max-width="600px" style="border-radius: 15px">
      <v-card-title class="title-border">
        <v-btn icon class="ml-n4" color="#008de4" @click="close()"
          ><v-icon>mdi-close</v-icon></v-btn
        >
        <span class="reply-to-jam">{{
          replyToJam.userName ? 'Reply to Jam' : 'Compose Jam'
        }}</span>
      </v-card-title>
      <v-row v-if="replyToJam.userName" class="pa-4 flex-nowrap" no-gutters>
        <v-col
          style="
            max-width: 49px;
            margin-top: 3px;
            display: flex;
            flex-flow: column;
          "
        >
          <v-row no-gutters style="max-height: 50px">
            <v-avatar color="grey" size="48">
              <v-img
                class="elevation-6"
                :src="getProfile(replyToJam.userName).avatar"
              ></v-img>
            </v-avatar>
          </v-row>
          <v-row align="stretch" justify="center">
            <div class="mt-1 mb-n5 connector-line"></div>
          </v-row>
        </v-col>
        <v-col class="py-0">
          <v-row class="px-3" justify="space-between" no-gutters>
            <span
              style="
                color: black;
                font-size: 16px;
                align-self: center;
                font-weight: 600;
              "
            >
              {{ replyToJam.userName }}
              <span class="subtitle-1 time-posted">
                @{{ replyToJam.userName }} ·
              </span>
              <span class="subtitle-1 time-posted">
                {{ posted(replyToJam.$createdAt) }}
              </span>
            </span>
          </v-row>
          <!-- <v-card-text> -->
          <v-row class="px-3" no-gutters>
            {{ replyToJam.text }}
          </v-row>
        </v-col>
      </v-row>

      <ComposeJam :reply-to-jam-id="replyToJam.$id" @success="close()" />
      <!-- </v-card-text> -->
    </v-card>
  </v-dialog>
  <!-- </div> -->
</template>

<script>
import { mapGetters } from 'vuex'
import ComposeJam from '~/components/ComposeJam'

export default {
  name: 'ComposeJamDialog',
  components: { ComposeJam },
  props: {
    dialog: { type: Boolean, default: false },
    replyToJam: {
      type: Object,
      default() {
        return {}
      },
    },
  },

  data() {
    return {}
  },
  computed: {
    ...mapGetters(['getProfile']),
    showDialog() {
      return this.dialog
    },
  },
  methods: {
    close() {
      this.$emit('close')
    },
    posted(posttime) {
      const d = new Date(posttime)
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
      if (now.getFullYear() === d.getFullYear()) {
        if (now.getMonth() === d.getMonth()) {
          if (now.getDate() === d.getDate()) {
            if (now.getHours() === d.getHours()) {
              if (now.getMinutes() === d.getMinutes()) {
                const sec = now.getSeconds() - d.getSeconds()
                return sec + ' sec'
              } else {
                const minutes = now.getMinutes() - d.getMinutes()
                return minutes + ' min'
              }
            }
            const hours = now.getHours() - d.getHours()
            return hours + 'h'
          } else {
            return months[d.getMonth()] + ' ' + d.getDate() + ''
          }
        }
        return 'this year'
      } else {
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
      }
    },
  },
}
</script>

<style scoped>
.avatar-column {
  display: flex;
  flex-flow: column;
}
.connector-line {
  width: 2px;
  /* background-color: rgb(192, 189, 189); */
  background-color: rgba(202, 197, 197, 0.904);
  /* flow-grow: 1; */
  z-index: 1;
}
.leftcol {
  max-width: 50px;
  margin-right: 10px;
}
.v-dialog {
  position: absolute;
  top: 20px;
}
.reply-to-jam {
  position: absolute;
  right: 25px;
  font-size: 18px;
  color: #008de4;
  font-weight: 800px;
}
.time-posted {
  text-decoration: none;
  font-size: 15px;
  color: #787878 !important;
}
.title-border {
  border-bottom: 1px solid;
  border-bottom-color: lightgray;
}
</style>
