<template>
  <v-col
    class="flex-nowrap fill-height"
    :class="{
      fullscreen: $vuetify.breakpoint.mdAndUp,
      halfscreen: $vuetify.breakpoint.smAndDown,
    }"
  >
    <!-- <v-row> -->
    <!-- middle column: compose jam and jam cards -->
    <!-- <v-col class="flex-nowrap" style="max-width: 600px"> -->
    <!-- <v-container class="pa-0 borders pt-0"> -->
    <!-- {{ $route.params }} -->
    <v-container
      v-if="$vuetify.breakpoint.smAndDown"
      class="pa-0"
      style="display: flex; height: 100%"
    >
      <v-row
        no-gutters
        justify="center"
        style="height: 100%; width: 100%; overflow-y: hidden"
      >
        <v-col cols="10" style="max-width: 600px" class="pa-0 borders">
          <messagesContactlist v-if="!$route.params.userName" />
          <messagesChat v-if="$route.params.userName" />
        </v-col>
      </v-row>
    </v-container>
    <v-container
      v-if="$vuetify.breakpoint.mdAndUp"
      class="pa-0 fill-height"
      style="display: flex; height: 100%"
    >
      <v-row class="flex-nowrap pt-0 fill-height" justify="center">
        <v-col class="borders pa-0 fill-height" style="max-width: 375px">
          <messagesContactlist />
        </v-col>
        <v-col class="borders pa-0" style="width: 600px">
          <messagesChat v-if="$route.params.userName" />
        </v-col>
      </v-row>
    </v-container>
    <!-- </v-container> -->
    <!-- </v-col> -->
    <!-- </v-row> -->
  </v-col>
</template>

<script>
import { mapGetters } from 'vuex'
import messagesContactlist from '~/components//messages/messagesContactlist'
import messagesChat from '~/components//messages/messagesChat'
// import messageLayout from '~/layouts/messageLayout'

export default {
  components: { messagesContactlist, messagesChat },
  // layout: 'messageLayout',
  computed: {
    ...mapGetters(['getProfile']),
  },
}
</script>

<style scoped>
.borders {
  max-width: 600px;
  border-left: solid;
  border-right: solid;
  border-color: #e2dfdfd8;
  border-width: 1px;
}
</style>
