<template>
  <v-card
    class="my-2 mx-auto"
    max-width="600"
    elevation="0"
    style="border-bottom: 1px solid; border-color: #e2dfdfd8"
  >
    <v-skeleton-loader
      max-width="300"
      type="list-item-avatar-two-line"
    ></v-skeleton-loader>

    <v-row
      no-gutters
      class="pt-2 pb-2 pr-3"
      style="
        justify-content: space-between;
        max-width: 425px;
        padding-left: 80px;
      "
    >
      <div class="hoverblue ml-n2">
        <v-btn icon>
          <v-icon size="19px">mdi-comment-outline</v-icon>
        </v-btn>
        <span class="subheading ml-n1 mr-2" style="font-size: 14px">?</span>
      </div>
      <div class="hovergreen">
        <v-btn icon>
          <v-icon size="22px" class="mr-1">mdi-twitter-retweet</v-icon>
        </v-btn>
        <span class="subheading mr-2 ml-n1" style="font-size: 14px">?</span>
      </div>
      <div class="hoverpink">
        <v-btn icon>
          <v-icon size="20px" class="mr-1">mdi-heart-outline</v-icon>
        </v-btn>
        <span class="subheading mr-2 ml-n1" style="font-size: 14px">? </span>
      </div>
      <div class="hoverblue">
        <v-btn icon>
          <v-icon size="20px" class="mr-1 dashicon" style="fill: #757575"
            >$dash
          </v-icon>
        </v-btn>
        <span class="subheading mr-2 ml-n1" style="font-size: 14px"></span>
      </div>
    </v-row>
    <!-- <v-card-text class="subtitle-1"> -->
    <!-- <v-skeleton-loader max-width="300" type="text"></v-skeleton-loader>
    <v-skeleton-loader max-width="100" type="text"></v-skeleton-loader> -->
    <!-- </v-card-text> -->

    <!-- <v-card-actions @click="showLoginNag()">
      <v-list-item class="grow">
        <v-row align="center" justify="end">
          <v-btn text disabled="">Follow </v-btn>
          <v-spacer />
          <v-icon class="mr-1">mdi-twitter-retweet</v-icon>
          <span class="subheading mr-2">3</span>
          <span class="mr-1">·</span>
          <v-icon class="mr-1" disabled="">'mdi-heart-outline' </v-icon>
          <span class="subheading mr-2">0</span>
          <span class="mr-1">·</span>
          <v-icon class="mr-1" disabled="">$dash </v-icon>
          <span class="mr-1">·</span>
          <v-icon class="mr-1">mdi-share-variant</v-icon>
          <span class="subheading">45</span>
        </v-row>
      </v-list-item>
    </v-card-actions> -->
  </v-card>
</template>
<script>
export default {
  name: 'TweetSkeleton',
}
</script>
