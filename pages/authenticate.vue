<template>
  <!-- <v-container :fill-height="!$vuetify.breakpoint.xs">
    <Mobile class="hidden-sm-and-up" /> <Desktop class="hidden-xs-only" />
  </v-container> -->

  <v-container fill-height>
    <!-- <v-alert dense outlined color="blue">
      <div>
        <strong>Heads Up:</strong> There is no working auto-faucet, use the
        faucet or console to send some eDuffs to:
        {{ this.$store.state.fundingAddress }}
      </div>
    </v-alert> -->
    <Desktop />
  </v-container>
</template>

<script>
import Mobile from '~/components/login/Mobile'
import Desktop from '~/components/login/Desktop'

export default {
  // eslint-disable-next-line vue/no-unused-components
  components: { Mobile, Desktop },
}
</script>
