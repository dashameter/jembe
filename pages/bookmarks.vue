<template>
  <v-col class="flex-nowrap" style="max-width: 920px">
    <v-row>
      <!-- middle column: compose jam and jam cards -->
      <v-col class="flex-nowrap py-2" style="max-width: 600px">
        <v-container class="pa-0 borders pt-0">
          <v-row align="center" no-gutters class="pl-1 mt-n1 py-2">
            <v-btn icon color="#008de4" @click="$router.go(-1)"
              ><v-icon>mdi-arrow-left</v-icon></v-btn
            >
            <span class="font-header pl-2"> Bookmarks </span>
          </v-row>
          <v-divider />
        </v-container>
      </v-col>

      <v-col
        v-if="$vuetify.breakpoint.mdAndUp"
        class="pt-0"
        style="max-width: 320px"
      >
        <searchBar />
      </v-col>
    </v-row>
  </v-col>
</template>
