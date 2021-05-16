<template>
  <Jam v-if="jam" :jam="jam" />
</template>

<script>
import { mapActions } from 'vuex'
import Jam from '~/components/jam'

export default {
  components: {
    Jam,
  },
  props: {
    jam: {
      type: Object,
      default() {
        return {}
      },
    },
  },
  created() {
    console.log('this.jam :>> ', this.jam)
    this.countLikes({ jamId: this.jam.$id })
    this.countComments({ jamId: this.jam.$id })
    this.countRejams({ jamId: this.jam.$id })
  },
  methods: {
    ...mapActions(['countLikes', 'countRejams', 'countComments']),
  },
}
</script>

<style></style>
