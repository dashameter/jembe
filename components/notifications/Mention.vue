<template>
  <Tweet v-if="jam" :jam="jam" />
</template>

<script>
import { mapActions } from 'vuex'
import Tweet from '~/components/tweet'

export default {
  components: {
    Tweet,
  },
  props: {
    mention: {
      type: Object,
      default() {
        return {}
      },
    },
  },
  data() {
    return {
      jam: null,
    }
  },
  async created() {
    this.jam = await this.fetchJamById(this.mention.jamId)
    this.countLikes({ jamId: this.jam.$id })
    this.countComments({ jamId: this.jam.$id })
    this.countRejams({ jamId: this.jam.$id })
  },
  methods: {
    ...mapActions([
      'fetchJamById',
      'countLikes',
      'countRejams',
      'countComments',
    ]),
  },
}
</script>

<style></style>
