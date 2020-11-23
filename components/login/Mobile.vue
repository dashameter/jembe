<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <Headline />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <Subline />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <NameField />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <NameButton />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import NameField from './NameField'
import NameButton from './NameButton'
import Headline from './Headline'
import Subline from './Subline'

export default {
  components: { NameField, NameButton, Headline, Subline },
}
</script>
