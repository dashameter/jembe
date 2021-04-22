<template>
  <div>
    <v-dialog v-model="showDialog" max-width="600px" class="mx-auto" persistent>
      <v-card style="border-radius: 15px" height="650px">
        <v-card-text class="pb-0">
          <v-row class="flex-nowrap">
            <v-col>
              <v-btn
                v-if="step > 0"
                icon
                color="#008de4"
                class="ml-n3"
                @click="step -= 1"
                ><v-icon>mdi-arrow-left</v-icon></v-btn
              >
            </v-col>
            <v-col align="center"
              ><v-img
                v-if="!$vuetify.breakpoint.xs"
                height="50px"
                contain
                :src="require('~/assets/jembe-logo.png')"
            /></v-col>
            <v-col align="end">
              <v-btn
                v-if="step === steps.length - 1"
                dense
                rounded
                dark
                elevation="0"
                color="#008de4"
                class="mr-n3"
                @click="$emit('close')"
                >Finished</v-btn
              >
              <v-btn
                v-else
                dense
                text
                rounded
                color="#008de4"
                class="mr-n3"
                @click="step += 1"
                >Skip for now</v-btn
              ></v-col
            >
          </v-row>
        </v-card-text>
        <v-card-title class="mt-n4">
          <span class="headline" v-text="steps[step].title" />
        </v-card-title>
        <v-card-subtitle class="pt-4" v-text="steps[step].subtitle" />
        <v-card-text class="text-center mt-14">
          <DisplayName v-if="step === 0" @nextStep="step += 1" />
          <AvatarPicker v-if="step === 1" @nextStep="step += 1" />
          <ThemePicker v-if="step === 2" @nextStep="step += 1" />
          <BioForm v-if="step === 3" @nextStep="$emit('close')" />
        </v-card-text>
        <!-- <ComposeJam :reply-to-jam-id="replyToJamId" @success="close()" /> -->
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import AvatarPicker from '~/components/profile/onboarding/AvatarPicker'
import ThemePicker from '~/components/profile/onboarding/ThemePicker'
import BioForm from '~/components/profile/onboarding/BioForm'
import DisplayName from '~/components/profile/onboarding/DisplayName'

export default {
  name: 'OnboardDialog',
  components: { AvatarPicker, ThemePicker, BioForm, DisplayName },
  props: {
    dialog: { type: Boolean, default: false },
    // replyToJamId: String,
    // replyToJamText: String,
  },

  data() {
    return {
      step: 0,
      steps: [
        {
          title: 'Choose your Jembe display name',
          subtitle:
            'Choose the name you want to display along with your username',
        },
        {
          title: 'Pick a profile picture',
          subtitle:
            'Want to be seen and not just heard? Upload the way you shine.',
        },
        {
          title: 'Pick your theme',
          subtitle:
            'The world will see it on your profile page. Share your style.',
        },
        {
          title: 'Share your Bio',
          subtitle: 'Share what makes you special. Have fun with it.',
        },
      ],
    }
  },
  computed: {
    showDialog() {
      return this.dialog
    },
  },
  methods: {
    close() {
      this.$emit('close')
    },
  },
}
</script>

<style>
.v-dialog {
}
</style>
