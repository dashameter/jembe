<template>
  <v-card max-width="280" class="mx-auto my-2">
    <v-img
      :src="require('~/assets/avataaars_folliwing.png')"
      height="194"
    ></v-img>
    <v-list-item>
      <v-list-item-content>
        <v-list-item-title class="headline"
          >Bob<v-btn
            class="mb-1"
            color="primary"
            elevation="0"
            :outlined="!isFollowed"
            dense
            rounded
            style="float: right"
            >{{ isFollowed ? 'Following' : 'Follow' }}</v-btn
          ></v-list-item-title
        >
        <v-list-item-subtitle>Bob's fancy status update</v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>

    <v-card-text class="subtitle-1">
      <p><v-icon>mdi-calendar-month</v-icon> Joined May 2017</p>
      <p>
        <span style="font-weight: bold">5</span> Following
        <span style="font-weight: bold" class="ml-2">47</span> Followers
      </p>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'Usercard',
  props: { isFollowed: Boolean },
}
</script>
