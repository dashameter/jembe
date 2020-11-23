<template>
  <v-card
    flat
    tile
    outlined
    class="px-3 py-2 tweetcard"
    style="background-color: inherit !important"
    @click="goTo(toThreadLink, $event)"
  >
    <v-row no-gutters>
      <v-col
        style="max-width: 50px; max-height=88px; margin-top: -2px;"
        class="mr-2"
        justify="end"
        ><v-btn icon style="float: right">
          <v-icon size="28" color="pink">mdi-heart</v-icon>
        </v-btn></v-col
      >
      <v-col>
        <!-- {{ $route.params.username }} -->
        <!-- need name and avatar correlated to jam that was liked - from dash platform -->
        <nuxt-link :to="'/' + like.userName">
          <v-avatar color="lightgray" size="30">
            <v-img
              class="elevation-6"
              :src="getProfile(like.userName).avatar"
            ></v-img> </v-avatar
        ></nuxt-link>
        <!-- <v-btn icon><v-icon large color="brown">mdi-dog</v-icon></v-btn> -->
        <div>
          <span style="font-weight: bold">{{ like.userName }} </span>liked your
          Jam
        </div>
        <span v-html="linkifyMe(opText)" />
        <v-skeleton-loader
          v-if="opText === ''"
          type="list-item-two-line"
        ></v-skeleton-loader>
      </v-col>
    </v-row>
  </v-card>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import linkifyString from 'linkifyjs/lib/linkify-string'

export default {
  props: {
    like: {
      type: Object,
      default() {
        return {}
      },
    },
  },
  computed: {
    ...mapGetters(['getProfile', 'getJamById']),
    toThreadLink() {
      if (this.$store.getters.hasDelegatedCredentials) {
        return '/' + this.like.userName + '/status/' + this.like.jamId
      } else {
        return ''
      }
    },

    opText() {
      if (this.getJamById(this.like.jamId)) {
        return this.getJamById(this.like.jamId).text
      } else {
        return ''
      }
    },
  },
  created() {
    this.fetchJamById(this.like.jamId)
  },
  methods: {
    ...mapActions(['fetchJamById']),
    linkifyMe(value) {
      return linkifyString(value, {
        //   defaultProtocol: 'https', // TODO production enable https
        target: {
          mention: '_parent',
          hashtag: '_parent',
          url: '_blank',
          email: '_blank',
        },
        nl2br: true,
        attributes: {},
        events: {
          click(e) {
            alert('Link clicked!')
          },
        },
        formatHref(href, type) {
          if (type === 'mention') {
            return `#${href}`
          } else if (type === 'hashtag') {
            return `#/${href}`
          } else return href
        },
      })
    },
    goTo(href, event) {
      if (event.srcElement.className !== 'linkified') this.$router.push(href)
    },
  },
}
</script>

<style></style>
