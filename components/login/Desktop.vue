<template>
  <v-container fill-height>
    <v-row align="center" justify="center">
      <v-col>
        <v-card
          :loading="$store.state.isSyncing"
          class="mx-auto"
          max-width="600px"
          elevation="0"
        >
          <v-card-text class="mb-n7">
            <Headline />
            <Subline class="headline" />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <LoginButton />
            <v-spacer></v-spacer>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import LoginButton from './LoginButton'
import Headline from './Headline'
import Subline from './Subline'

export default {
  components: { LoginButton, Headline, Subline },
}
</script>
