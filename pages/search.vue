<template>
  <v-col
    class="flex-nowrap"
    :class="{
      fullscreen: $vuetify.breakpoint.mdAndUp,
      halfscreen: $vuetify.breakpoint.smAndDown,
    }"
  >
    <v-container class="pa-0" style="display: flex; height: 100%">
      <v-row no-gutters justify="start">
        <v-col cols="10" style="max-width: 600px" class="pa-0 borders">
          <!-- content -->
          <v-row align="center" no-gutters class="headerbar py-2">
            <v-btn icon color="#008de4" @click="$router.go(-1)"
              ><v-icon>mdi-arrow-left</v-icon></v-btn
            >
            <span class="font-header pl-2"> Explore </span>
          </v-row>
          <v-divider />
        </v-col>
      </v-row>
    </v-container>
  </v-col>
</template>

<script>
export default {
  async created() {},
}
</script>

<style></style>
