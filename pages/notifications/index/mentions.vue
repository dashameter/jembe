<template>
  <div>
    <Mention
      v-for="(notification, i) in getNotifications.filter(
        (n) => n.$type === 'mentions'
      )"
      :key="i"
      :mention="notification"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Mention from '~/components/notifications/Mention'

export default {
  components: {
    Mention,
  },
  computed: {
    ...mapGetters(['getNotifications']),
  },
}
</script>

<style></style>
