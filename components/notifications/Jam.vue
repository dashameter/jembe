<template>
  <v-card
    flat
    tile
    outlined
    class="px-3 py-2 tweetcard"
    style="background-color: inherit !important"
    @click="goTo(toThreadLink, $event)"
  >
    <!-- {{ jam }} -->
    <v-row no-gutters>
      <v-col
        style="max-width: 50px; max-height=88px; margin-top: -2px;"
        class="mr-2"
        justify="end"
      >
        <nuxt-link :to="'/' + like.userName">
          <v-avatar color="lightgray" size="30">
            <v-img class="elevation-6" :src="profile.avatar"></v-img> </v-avatar
        ></nuxt-link>
      </v-col>
      <v-col>
        <!-- {{ $route.params.username }} -->
        <!-- need name and avatar correlated to jam that was liked - from dash platform -->
        <nuxt-link :to="'/' + jam.userName">
          <v-avatar color="lightgray" size="30">
            <v-img
              class="elevation-6"
              :src="getProfile(jam.userName).avatar"
            ></v-img> </v-avatar
        ></nuxt-link>
        <!-- <v-btn icon><v-icon large color="brown">mdi-dog</v-icon></v-btn> -->
        <div>
          <span style="font-weight: bold">{{ jam.userName }} </span>rejammed
          your Jam
        </div>
        <span v-html="linkifyMe(opText)" />
        <v-skeleton-loader
          v-if="opText === ''"
          type="list-item-two-line"
        ></v-skeleton-loader>
        <!-- displayJamText(notification.id).text -->
        <!-- need jam.text from correlated jam - pull from dash platform -->
      </v-col>
    </v-row>
  </v-card>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
// import * as linkify from 'linkifyjs'
// import mention from 'linkifyjs/plugins/mention'
// import hashtag from 'linkifyjs/plugins/hashtag'
import linkifyString from 'linkifyjs/lib/linkify-string'
// mention(linkify)
// hashtag(linkify)

export default {
  props: {
    jam: {
      type: Object,
      default() {
        return {}
      },
    },
  },
  data() {
    return { p: { text: '@dashameter ' } }
  },
  computed: {
    ...mapGetters(['getProfile', 'getJamById']),
    toThreadLink() {
      if (this.$store.getters.hasSession) {
        return (
          '/' +
          this.getJamById(this.jam.reJamId).userName +
          '/status/' +
          this.getJamById(this.jam.reJamId).$id
        )
      } else {
        return ''
      }
    },

    opText() {
      if (this.getJamById(this.jam.reJamId)) {
        return this.getJamById(this.jam.reJamId).text
      } else {
        return ''
      }
    },
  },
  async created() {
    this.p.text = await this.fetchJamById(this.jam.reJamId)
    console.log('this.p.text :>> ', this.p.text)
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
