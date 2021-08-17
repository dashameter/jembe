import Dash from 'dash'
import DashDappConnect from 'dash-dapp-connect'
import Vue from 'vue'
// eslint-disable-next-line no-unused-vars
import { decrypt, encrypt } from 'dashmachine-crypto'
import dsm from 'dash-secure-message'
import { crypto } from '@dashevo/dashcore-lib'
import { ObjectID } from 'bson'

import * as linkify from 'linkifyjs'
import mention from 'linkifyjs/plugins/mention'
import hashtag from 'linkifyjs/plugins/hashtag'
mention(linkify)
hashtag(linkify)

console.log('process.env:>> ', process.env)

const $dappName = 'Jembe'
const $dappIcon = ''

// Helper Function
// TODO move to helper module
const timestamp = () => Math.floor(Date.now())

function sha256(message) {
  // // encode as UTF-8
  const msgBuffer = new TextEncoder('utf-8').encode(message)

  // // hash the message
  // const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashBuffer = crypto.Hash.sha256(msgBuffer)

  // // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  // // convert bytes to hex string
  const hashHex = hashArray
    .map((b) => ('00' + b.toString(16)).slice(-2))
    .join('')
  return hashHex
}

//
// Cache identity lookups to speed up UX by avoiding to hit dapi multiple times
//

const IdentitiesCache = {}

// eslint-disable-next-line no-unused-vars
const cachedOrGetIdentity = async (client, identityId) => {
  console.log(
    'Checking IdentitiesCache for known identities using IdentityId',
    identityId
  )
  let identity
  if (identityId in IdentitiesCache) {
    identity = IdentitiesCache[identityId]
    console.log('Found existing cached identity', identity)
  } else {
    identity = await client.platform.identities.get(identityId)
    IdentitiesCache[identity.id] = identity
    console.log('Fetched unknown identity', identity)
  }
  console.log({ IdentitiesCache })
  return identity
}

//
//

let client
let clientTimeout
let registerIdentityInterval

const Connect = new DashDappConnect()

// mnemonic: "come sight trade detect travel hazard suit rescue special clip choose crouch"
const getInitState = () => {
  console.log('getinitstate')
  return {
    accountDPNS: {},
    loadingSteps: [
      '1/3 Requesting Dash from faucet',
      '2/3 Creating delegate identity',
      '3/3 Sending request to EvoWallet ',
    ],
    loadingStep: 0,
    presentedOnboarding: false,
    fundingAddress: '',
    mnemonic: process.env.MNEMONIC,
    // identityId: process.env.IDENTITYID, // DEPRECATED
    tmpPrivKey: '',
    session: {},
    validSessionIdentities: {},
    accounts: [],
    name: {
      label: process.env.NAME_LABEL,
      userId: process.env.NAME_USERID,
      isValid: false,
      uidPin: '',
      identityId: process.env.NAME_IDENTITY,
      userPubKey: '',
    }, // TODO replace with accounts, name -> user
    onboardText: 'Enter',
    onboardType: '',
    jams: {},
    users: {},
    dpns: {},
    userSignups: {},
    follows: { following: {}, followers: {} },
    likedJamsByUsername: {},
    likesCount: {},
    bookmarkedJams: [],
    commentsCount: {},
    rejamsCount: {},
    isClientError: false,
    isSyncing: false,
    snackbar: { show: false, color: 'red', text: '', timestamp: 0, link: null },
    directMessage: {
      dmsg: [],
      // lastTimeCheckedReceived: 0,
      // lastTimeCheckedSent: 0,
    },
    reactions: {},
    contactList: {},
    notifications: [],
    jamsById: {},
    lastSeen: {},
    dappState: { lastSeen: {} },
  }
}
export const state = () => getInitState()

export const getters = {
  myUserName(state) {
    return state.accountDPNS.label
  },
  isLoggedIn(state) {
    return !!state.accountDPNS.label
  },
  getUserName: (state) => (ownerId) => {
    return state.dpns[ownerId]
      ? state.dpns[ownerId].label
      : ownerId.substr(0, 6)
  },
  getReaction: (state) => (messageId) => {
    return state.reactions[messageId] ? state.reactions[messageId] : ''
  },
  getContactListNames(state) {
    const contactList = []

    for (const [, contactDoc] of Object.entries(state.contactList)) {
      const contact =
        contactDoc.senderUserId === state.name.userId
          ? contactDoc.receiverUserName
          : contactDoc.senderUserName

      contactList.push(contact)
    }
    return contactList
  },
  getUnreadDirectMessageCount(state, getters) {
    let unreadCount = 0

    for (const [, contactDoc] of Object.entries(state.contactList)) {
      const { receiverUserName, senderUserName } = contactDoc

      const chatPartnerUserName =
        receiverUserName.toLowerCase() === state.name.label.toLowerCase()
          ? senderUserName
          : receiverUserName

      unreadCount += getters.getUnreadDirectMessageCountByChatPartnerUserName(
        chatPartnerUserName
      )
    }

    return unreadCount
  },
  getTempIdentityId() {
    return client.account.getIdentityIds()[0]
  },
  getValidSessionIdentity: (state) => (doc) => {
    console.log('validsession :>> ', doc)
    const sessionIdentityId = doc.$ownerId
    // const createdAt = doc.$createdAt

    if (sessionIdentityId in state.validSessionIdentities) {
      console.log(
        'validsession',
        state.validSessionIdentities[sessionIdentityId]
      )
      const [validSessionIdentity] = state.validSessionIdentities[
        sessionIdentityId
      ].filter(
        (x) =>
          x.$createdAt < doc.$createdAt &&
          x.expiresAt > doc.$createdAt &&
          x.sessionIdentityId === doc.$ownerId &&
          x.contractId === doc.$dataContractId
      )
      console.log(
        'validsession found cached sessionidentity :>> ',
        validSessionIdentity
      )
      return validSessionIdentity || null
    } else {
      console.log(
        'validsession no cached sessionidentity found, fetching a new one ..:>> '
      )
      return null
    }
  },
  getLastPartnerMessage: (state, getters) => (chatPartnerUserName) => {
    const chatPartnerMessages = state.directMessage.dmsg.filter((message) => {
      return message.senderUserName === chatPartnerUserName
    })
    const lastDoc = chatPartnerMessages[chatPartnerMessages.length - 1]
    return lastDoc ? lastDoc.encMessage : ''
  },
  getLastPartnerMessageTime: (state, getters) => (chatPartnerUserName) => {
    const chatPartnerMessages = state.directMessage.dmsg.filter((message) => {
      return message.senderUserName === chatPartnerUserName
    })
    const lastDoc = chatPartnerMessages[chatPartnerMessages.length - 1]
    console.log('lastDoc :>> ', lastDoc)
    return lastDoc ? lastDoc.$createdAt : 0
  },
  getUnreadDirectMessageCountByChatPartnerUserName: (state, getters) => (
    chatPartnerUserName
  ) => {
    const lastSeenTimestamp = state.dappState.lastSeen[chatPartnerUserName] || 0
    console.log(
      'getUnreadDirectMessageCountByChatPartnerUserName lastSeen timestamp:>> ',
      chatPartnerUserName,
      lastSeenTimestamp
    )
    const chatPartnerMessages = state.directMessage.dmsg.filter((message) => {
      return (
        message.senderUserName === chatPartnerUserName &&
        message.$createdAt > lastSeenTimestamp
      )
    })

    return chatPartnerMessages.length
  },
  badgeCount: (state, getters) => (eventType) => {
    console.log('badgecount, eventType :>> ', eventType)
    if (eventType === 'notifications') {
      return state.notifications.filter(
        (n) => n.$createdAt > state.lastSeen.notifications
      ).length
    } else if (eventType === 'messages') {
      console.log('message counting')
      console.log('object :>> ', getters.getUnreadDirectMessageCount)
      return getters.getUnreadDirectMessageCount
    } else return 0
  },
  getLastSeen: (state) => (eventType) => {
    return state.lastSeen[eventType] || 0
  },
  getJamById: (state) => (id) => {
    return state.jamsById[id]
  },
  getNotifications(state) {
    return state.notifications
  },
  getLastNotificationTime: (state) => (typeOfNotification) => {
    const filteredNotifications = state.notifications.filter((n) => {
      return n.$type === typeOfNotification
    })
    if (filteredNotifications.length > 0) {
      return filteredNotifications[0].$createdAt
    } else {
      return 0
    }
  },
  getMyContactList(state) {
    return Object.entries(state.contactList)
  },
  getDirectMessages: (state) => (chatPartnerUserName) => {
    const directMessages = state.directMessage.dmsg.filter((message) => {
      return (
        message.senderUserId === chatPartnerUserName ||
        message.receiverUserId === chatPartnerUserName
      )
    })

    return directMessages
  },
  getUserFollowing: (state) => (jammerId) => {
    const following = state.follows.following[jammerId]
    return following ? following.docs : []
  },
  getUserFollowers: (state) => (jammerId) => {
    const followers = state.follows.followers[jammerId]
    return followers ? followers.docs : []
  },
  getiFollow: (state) => (jammerId) => {
    console.log('state.follows :>> ', state.follows)
    console.log('state.accountDPNS.$ownerId :>> ', state.accountDPNS.$ownerId)
    console.log(
      ' state.follows.following[state.accountDPNS.$ownerId]:>> ',
      state.follows.following[state.accountDPNS.$ownerId]
    )
    const following = state.follows.following[state.accountDPNS.$ownerId]
    console.log(
      'following',
      jammerId,
      following ? following.docs.includes(jammerId) : false
    )
    return following ? following.docs.includes(jammerId) : false
  },
  getUserFollowersCount: (state) => (jammerId) => {
    const follows = state.follows.followers[jammerId]
    console.log('follows :>> ', follows)

    return follows ? follows.docs.length : '?'
  },
  getUserFollowingCount: (state) => (jammerId) => {
    const follows = state.follows.following[jammerId]

    return follows ? follows.docs.length : '?'
  },
  getUserSignupTime: (state) => (userName) => {
    const signup = state.userSignups[userName.toLowerCase()]

    return signup ? signup.humanTime : '?'
  },
  getProfile: (state) => (userName) => {
    let storedProfile = {}

    // username is initially undefined and fetched async
    // username exists, profile exists, else empty object
    if (userName) storedProfile = state.users[userName.toLowerCase()] || {}

    const profile = {}
    profile.avatar = storedProfile.avatar || require('~/assets/avataaar.png')
    profile.theme = storedProfile.theme || require('~/assets/theme.png')
    profile.statusMessage = storedProfile.statusMessage || ''
    profile.displayName = storedProfile.displayName || ''

    profile.avatarRaw = storedProfile.avatarRaw || ''
    profile.themeRaw = storedProfile.themeRaw || ''

    return profile
  },
  getLoadingStep(state) {
    return state.loadingSteps[state.loadingStep]
  },
  getJams: (state) => (view) => {
    return state.jams[view]
  },
  getCommentsCount: (state) => (jamId) => {
    return state.commentsCount[jamId]
      ? state.commentsCount[jamId].comments
      : '?'
  },
  getRejamsCount: (state) => (jamId) => {
    return state.rejamsCount[jamId] ? state.rejamsCount[jamId].rejams : '?'
  },
  getLikesCount: (state) => (jamId) => {
    return state.likesCount[jamId] ? state.likesCount[jamId].likes : '?'
  },
  getiLiked: (state) => (jamId) => {
    return state.likesCount[jamId] ? state.likesCount[jamId].iLiked : false
  },
  getLikedJamsByUsername: (state) => (userName) => {
    return state.likedJamsByUsername[userName] || []
  },
  getiBookmarked: (state) => (jamId) => {
    const bookmarkedJams = state.bookmarkedJams.filter(
      (jam) => jam.$id === jamId
    )
    return bookmarkedJams.length > 0
  },
  getBookmarkedJams(state) {
    return state.bookmarkedJams
  },
}

export const mutations = {
  setReactions(state, { messageId, reaction }) {
    Vue.set(state.reactions, messageId, reaction)
  },
  setAccountDPNS(state, accountDPNS) {
    Vue.set(state, 'accountDPNS', accountDPNS)
  },
  setLastSeenDirectMessage(state, { chatPartnerUserName, timestamp }) {
    Vue.set(state.dappState.lastSeen, chatPartnerUserName, timestamp)
  },
  setValidSessionIdentity(state, session) {
    if (state.validSessionIdentities[session.sessionIdentityId])
      state.validSessionIdentities[session.sessionIdentityId].push(session)
    else
      Vue.set(state.validSessionIdentities, session.sessionIdentityId, [
        session,
      ])
  },
  setLikedJamsByUsername(state, { jams, userName }) {
    Vue.set(state.likedJamsByUsername, userName, jams)
  },
  setBookmarked(state, jams) {
    console.log('bookmarkedJams', jams)
    Vue.set(state, 'bookmarkedJams', jams)
  },
  setLastSeen(state, { eventType, lastSeenTimestamp }) {
    Vue.set(state.lastSeen, eventType, lastSeenTimestamp)
  },
  setJamById(state, jam) {
    Vue.set(state.jamsById, jam.$id, jam)
  },
  setNotifications(state, sortedNotifications) {
    state.notifications = [...sortedNotifications, ...state.notifications]
  },
  setContactList(state, contacts) {
    contacts.forEach((contact) => {
      const contactJSON = contact.toJSON()

      // Use sorted combination of both userIds as unique key to deduplicate
      const sortedUserIds = [
        contactJSON.receiverUserId,
        contactJSON.senderUserId,
      ].sort()

      Vue.set(state.contactList, sortedUserIds, contactJSON)
    })
  },
  addContactToList(state, contact) {
    const contactJSON = contact.toJSON()

    // Use sorted combination of both userIds as unique key to deduplicate
    const sortedUserIds = [
      contactJSON.receiverUserId,
      contactJSON.senderUserId,
    ].sort()

    Vue.set(state.contactList, sortedUserIds, contactJSON)
  },
  setDirectMessage(state, directMessage) {
    console.log('directMessage :>> ', directMessage)
    Vue.set(state.directMessage, 'dmsg', directMessage.dmsg)
  },
  updateDirectMessageSending(state, { tmp$id, directMessage }) {
    const idx = state.directMessage.dmsg.findIndex(
      (message) => message.$id === tmp$id
    )
    if (idx > -1) Vue.set(state.directMessage.dmsg, idx, directMessage)
  },
  appendDirectMessageSending(state, directMessage) {
    state.directMessage.dmsg.push(directMessage)
  },
  setPresentedOnboarding(state, bool) {
    state.presentedOnboarding = bool
  },
  setDPNSDoc(state, dpnsDoc) {
    Vue.set(state.dpns, dpnsDoc.records.dashUniqueIdentityId, dpnsDoc)
  },
  setFollows(state, { follows, followType, ownerId }) {
    console.log('setFollows', { follows, followType, ownerId })
    Vue.set(state.follows[followType], ownerId, follows)
  },
  setUserSignup(state, { humanTime, doc, userName, userId }) {
    const signup = { humanTime, doc }
    Vue.set(state.userSignups, userName.toLowerCase(), signup)
  },
  setProfile(state, profile) {
    const userNormalizedLabel = profile.userNormalizedLabel.toLowerCase()
    Vue.set(state.users, userNormalizedLabel, profile)
  },
  setLoadingStep(state, step) {
    state.loadingStep = step
  },
  setState(state, newState) {
    console.log('setstate')
    this.replaceState(newState)
  },
  setFundingAddress(state, address) {
    console.log('setting funding address', address)
    state.fundingAddress = address
  },
  // DEPRECATED
  // setIdentity(state, identityId) {
  //   state.identityId = identityId.toString()
  // },
  setMnemonic(state, mnemonic) {
    state.mnemonic = mnemonic
  },
  setTmpPrivKey(state, tmpPrivKey) {
    state.tmpPrivKey = tmpPrivKey
  },
  setUserPubKey(state, userPubKey) {
    state.userPubKey = userPubKey
  },
  setSession(state, { session }) {
    // state.session = { ...session }
    Vue.set(state, 'session', { ...session })
  },
  setiFollow(state, { jammerId, isFollowing }) {
    const ownerId = state.accountDPNS.$ownerId

    const initFollow = {
      docs: [],
      refreshedAt: 0,
    }

    // Init follow if it has not finished fetching
    if (!state.follows.following[ownerId]) {
      Vue.set(state.follows.following, ownerId, initFollow)
    }

    // Just using a shorter var for brevity
    const docs = state.follows.following[ownerId].docs

    if (isFollowing) {
      // Add userId of person I follow to state
      docs.push(jammerId)
    } else {
      // Remove the userId of the person I unfollow from state
      state.follows.following[ownerId].docs = docs.filter(
        (item) => item !== jammerId
      )
    }
  },
  setJams(state, { jams, view }) {
    // state.jams = { ...state.jams, [view]: jams }
    Vue.set(state.jams, view, jams)
  },
  setLikes(state, likesCount) {
    Vue.set(state.likesCount, likesCount.jamId, likesCount)
  },
  setComments(state, { jamId, comments, refreshedAt }) {
    // Init empty Object so we can set the properties
    // if (!state.commentsCount[jamId]) {
    //   state.commentsCount[jamId] = {}
    // }

    // state.commentsCount[jamId].jamId = jamId
    // state.commentsCount[jamId].comments = comments
    // state.commentsCount[jamId].refreshedAt = refreshedAt

    Vue.set(state.commentsCount, jamId, { jamId, comments, refreshedAt })
  },
  setRejams(state, { jamId, rejams, refreshedAt }) {
    let prevRejams = 0
    if (state.rejamsCount[jamId]) {
      prevRejams = state.rejamsCount[jamId].rejams
    } else {
      state.rejamsCount[jamId] = {}
    }
    const newRejams = prevRejams + rejams
    state.rejamsCount[jamId].rejams = newRejams
    state.rejamsCount[jamId].refreshedAt = refreshedAt
  },
  setOnboardText(state, text) {
    state.onboardText = text
  },
  setOnboardType(state, type) {
    state.onboardType = type
  },
  setNameValid(state, isValid) {
    // state.name.isValid = isValid
    Vue.set(state.name, 'isValid', isValid)
  },
  setName(state, name) {
    Vue.set(state.name, 'label', name)
    // state.name.label = name
  },
  setUidPin(state, uidPin) {
    // state.name.uidPin = uidPin
    Vue.set(state.name, 'uidPin', uidPin)
  },
  setUserId(state, userId) {
    // state.name.userId = userId
    Vue.set(state.name, 'userId', userId)
  },
  setUserIdentityId(state, identityId) {
    // state.name.identityId = identityId
    Vue.set(state.name, 'identityId', identityId)
  },
  setSnackBar(state, { text, color = 'red', link = null }) {
    state.snackbar.text = text
    state.snackbar.color = color
    state.snackbar.link = link
    state.snackbar.show = true
    state.snackbar.timestamp = timestamp()
  },
  clearClientErrors(state) {
    state.clientErrorMsg = ''
    state.isClientError = false
    // state.isSyncing = false
  },
  setIsSyncing(state, isSyncing) {
    state.isSyncing = isSyncing
  },
}

export const actions = {
  searchTags({ dispatch }, searchVal) {
    const queryOpts = {
      limit: 100,
      startAt: 1,
      orderBy: [['$createdAt', 'desc']],
      where: [['tag', 'startsWith', searchVal.toLowerCase()]],
    }
    console.log('searchTags queryOpts :>> ', queryOpts)
    return dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'tags',
      queryOpts,
    })
  },
  async fetchValidSessionIdentity({ dispatch, commit, getters }, doc) {
    let validSessionIdentity = getters.getValidSessionIdentity(doc)

    if (validSessionIdentity) return validSessionIdentity

    const queryOpts = {
      limit: 1,
      startAt: 1,
      where: [
        ['$createdAt', '<', doc.$createdAt],
        ['expiresAt', '>', doc.$createdAt],
        ['sessionIdentityId', '==', doc.$ownerId],
        ['contractId', '==', doc.$dataContractId],
      ],
    }
    console.log('validator.queryOpts :>> ', queryOpts)

    validSessionIdentity = (
      await dispatch('queryDocuments', {
        dappName: 'primitives',
        typeLocator: 'Session',
        queryOpts,
      })
    )[0]

    if (validSessionIdentity) {
      validSessionIdentity = validSessionIdentity.toJSON()
      commit('setValidSessionIdentity', validSessionIdentity)
    }

    return validSessionIdentity || null
  },
  async fetchLastSeen({ commit, dispatch, state }, eventType) {
    const queryOpts = {
      limit: 1,
      startAt: 1,
      orderBy: [['timestamp', 'desc']],
      where: [
        ['eventType', '==', eventType],
        ['userId', '==', state.name.userId],
      ],
    }

    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'lastSeen',
      queryOpts,
    })

    console.log('lastSeen', result)

    const lastSeenTimestamp = result.length > 0 ? result[0].data.timestamp : 0

    commit('setLastSeen', { eventType, lastSeenTimestamp })
  },
  async saveLastSeen(
    { commit, dispatch, state },
    { eventType, lastSeenTimestamp }
  ) {
    const doc = {
      eventType,
      timestamp: lastSeenTimestamp,
      userId: state.name.userId,
      userName: state.name.label,
    }
    const lastSeenTimestampResult = await dispatch('submitDocument', {
      contract: 'jembe',
      type: 'lastSeen',
      doc,
    })
    console.log('seen', lastSeenTimestampResult)
  },
  async bookmarkJam({ dispatch, state }, { jamId, isBookmarked = true }) {
    const bookmark = {
      jamId,
      isBookmarked,
    }
    await dispatch('submitDocument', {
      typeLocator: 'jembe.bookmarks',
      document: bookmark,
    })
  },
  async fetchBookmarks({ commit, dispatch, state }) {
    const queryOpts = {
      limit: 100,
      startAt: 1,
      orderBy: [['$createdAt', 'desc']],
      where: [['$ownerId', '==', state.accountDPNS.$ownerId]],
    }

    const bookmarksByUserId = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'bookmarks',
      queryOpts,
    })

    console.log('bookmarksByUserId :>>', bookmarksByUserId)

    const bookmarked = []
    const notBookmarked = []

    bookmarksByUserId.forEach((bookmark) => {
      console.log('bookmark', bookmark)
      if (
        !notBookmarked.includes(bookmark.jamId) &&
        !bookmarked.includes(bookmark.jamId)
      ) {
        if (bookmark.isBookmarked) {
          bookmarked.push(bookmark.jamId)
          console.log('bookmarked', bookmarked)
        } else {
          notBookmarked.push(bookmark.jamId)
          console.log('notbookmarked', notBookmarked)
        }
      }
    })
    const promisedBookmarks = bookmarked.map((jamId) =>
      dispatch('fetchJamById', jamId)
    )
    const bookmarkedJamsByUser = await Promise.all(promisedBookmarks)
    //   jams: bookmarkedJamsByUser,
    //   jams: bookmarkedJamsByUser,
    //   userName: state.name.label,
    // })
    commit('setBookmarked', bookmarkedJamsByUser)
  },
  async fetchLikesByUser({ commit, dispatch, state }, { ownerId }) {
    const queryOpts = {
      limit: 20,
      startAt: 1,
      orderBy: [['$updatedAt', 'desc']],
      where: [['$ownerId', '==', ownerId]],
    }

    let likesByUserId = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'likes',
      queryOpts,
    })

    likesByUserId = likesByUserId.map((x) => x.toJSON())

    console.log('likesByUserId :>> ', likesByUserId)

    const seenJamIds = []
    const trueLikes = []

    for (let i = 0; i < likesByUserId.length; i++) {
      if (!seenJamIds.includes(likesByUserId[i].jamId)) {
        if (likesByUserId[i].isLiked === true) {
          trueLikes.push(likesByUserId[i])
        }
        seenJamIds.push(likesByUserId[i].jamId)
      }
    }
    console.log('truelikes :>> ', trueLikes)

    const promisedLikes = trueLikes.map((like) =>
      dispatch('fetchJamById', like.jamId)
    )
    const likedJamsByUser = await Promise.all(promisedLikes)

    console.log('likedJamsByUser :>> ', likedJamsByUser)
    commit('setLikedJamsByUsername', {
      jams: likedJamsByUser,
      userName: ownerId,
    })
  },
  async fetchNotifications({ commit, dispatch, state, getters }) {
    const fetchIt = async function ({ docType, where }) {
      const queryOpts = {
        limit: 10,
        startAt: 1,
        orderBy: [['$createdAt', 'desc']],
        where: [['$createdAt', '>', getters.getLastNotificationTime(docType)]],
      }

      queryOpts.where = queryOpts.where.concat(where)

      console.log('notifications queryOpts :>> ', docType, queryOpts)

      return (
        await dispatch('queryDocuments', {
          dappName: 'jembe',
          typeLocator: docType,
          queryOpts,
        })
      ).map((n) => n.toJSON())
    }

    const notificationTypes = [
      {
        docType: 'jams',
        where: [['opOwnerId', '==', state.accountDPNS.$ownerId]],
      },
      {
        docType: 'likes',
        where: [
          ['opOwnerId', '==', state.accountDPNS.$ownerId],
          ['isLiked', '==', true],
        ],
      },
      {
        docType: 'mentions',
        where: [
          ['mentionedOwnerId', '==', state.accountDPNS.$ownerId],
          // ['index', '<', 5],
        ],
      },
    ]

    const result = await Promise.all(notificationTypes.map((t) => fetchIt(t)))

    const notifications = [].concat(...result)

    const sortedNotifications = notifications.sort((a, b) =>
      a.$createdAt < b.$createdAt ? 1 : -1
    )
    console.log({ notifications })

    commit('setNotifications', sortedNotifications)
  },
  async fetchContactlist({ commit, dispatch, state }, { userId }) {
    const queryOptsReceived = {
      limit: 100,
      startAt: 1,
      orderBy: [['$createdAt', 'desc']],
      where: [['receiverUserId', '==', userId]],
    }

    const contactListReceivedPromise = dispatch('queryDocuments', {
      dappName: 'directmessage',
      typeLocator: 'contacts',
      queryOpts: queryOptsReceived,
    })

    const queryOptsSent = {
      limit: 100,
      startAt: 1,
      orderBy: [['$createdAt', 'desc']],
      where: [['senderUserId', '==', userId]],
    }

    const contactListSentPromise = dispatch('queryDocuments', {
      dappName: 'directmessage',
      typeLocator: 'contacts',
      queryOpts: queryOptsSent,
    })

    const [
      contactListResultReceived,
      contactListResultSent,
    ] = await Promise.all([contactListReceivedPromise, contactListSentPromise])

    console.log('contactListResultSent :>> ', contactListResultSent)

    console.log('queryOptsSent :>> ', queryOptsSent)

    const contactListResult = contactListResultReceived.concat(
      contactListResultSent
    )

    console.log('contactListResult :>> ', contactListResult)

    commit('setContactList', contactListResult)
  },

  async fetchDirectMessages({ commit, dispatch, state, getters }) {
    // deep copy the object and array to avoid mutating it
    const directMessage = {}
    directMessage.dmsg = [...state.directMessage.dmsg]

    const lastTimeChecked = function (direction) {
      const dms = directMessage.dmsg.filter(
        (message) =>
          message[`${direction}UserId`] === state.name.userId &&
          !message.isSending // Only consider timestamps of messages already on dpp
      )
      console.log('dms :>> ', dms)
      if (dms.length > 0) return dms[dms.length - 1].$createdAt
      else return 0
    }

    const queryOptsReceived = {
      limit: 100,
      startAt: 1,
      orderBy: [['$createdAt', 'desc']],
      where: [
        ['$createdAt', '>', lastTimeChecked('receiver')],
        ['receiverUserId', '==', state.name.userId],
      ],
    }

    console.log('queryOptsReceived :>> ', queryOptsReceived)

    const queryOptsSent = {
      limit: 100,
      startAt: 1,
      orderBy: [['$createdAt', 'desc']],
      where: [
        ['$createdAt', '>', lastTimeChecked('sender')],
        ['senderUserId', '==', state.name.userId],
      ],
    }

    console.log('queryOptsSent :>> ', queryOptsSent)

    const receivedResult = dispatch('queryDocuments', {
      dappName: 'directmessage',
      typeLocator: 'dmsg',
      queryOpts: queryOptsReceived,
    })

    receivedResult.then((receivedResult) => {
      console.log('receivedResult :>> ', receivedResult)

      if (receivedResult[0]) {
        directMessage.lastTimeCheckedReceived = receivedResult[0].toJSON().$createdAt
      }

      let showedNotification = false
      receivedResult.forEach((element) => {
        const decryptedMessage = { ...element.toJSON() }

        const encMessage = JSON.parse(
          Buffer.from(element.data.encMessage, 'base64')
        )

        decryptedMessage.encMessage = dsm.decrypt(
          state.session.pvtKey,
          encMessage.msg.map((x) => x[1]),
          encMessage.senderPubKey,
          {}
        )[0][1]

        // Add new received messages to array that we commit to state
        directMessage.dmsg.push(decryptedMessage)

        // Only show 1 notification of the newest received message
        if (showedNotification) return

        // Don't show notification if we have focus on the same conversation
        if (
          document.hasFocus() &&
          this.$router.currentRoute.path ===
            '/messages/' + decryptedMessage.senderUserName.toLowerCase()
        )
          return

        // Don't show notification if it's an old message
        if (
          state.dappState.lastSeen[
            decryptedMessage.senderUserName.toLowerCase()
          ] >= decryptedMessage.$createdAt
        )
          return

        showedNotification = true // Ensure code below is not looped over again to avoid showing an older msg in the notification

        const title = decryptedMessage.senderUserName

        const options = {
          body: decryptedMessage.encMessage,
          tag: 'messages',
          vibrate: [100, 50, 100],
          data: {
            name: decryptedMessage.senderUserName,
            timestamp: decryptedMessage.$createdAt,
          },
        }

        const notification = new Notification(title, options)

        notification.onshow = function (event) {
          document.getElementById('directMessageDing').play()
        }

        const that = this

        notification.onclick = function (event) {
          that.$router.push('/messages/' + notification.data.name)
          console.log('event :>> ', event)
          parent.focus()
          window.focus()
          event.target.close()
        }
      })
    })

    const sentResult = dispatch('queryDocuments', {
      dappName: 'directmessage',
      typeLocator: 'dmsg',
      queryOpts: queryOptsSent,
    })

    sentResult.then((sentResult) => {
      console.log('sentResult :>> ', sentResult)

      if (sentResult[0])
        directMessage.lastTimeCheckedSent = sentResult[0].toJSON().$createdAt

      sentResult.forEach((element) => {
        const decryptedMessage = { ...element.toJSON() }

        console.log('decryptedMessage :>> ', decryptedMessage)

        const encMessage = JSON.parse(
          Buffer.from(element.data.encMessage, 'base64')
        )

        decryptedMessage.encMessage = dsm.decrypt(
          state.session.pvtKey,
          encMessage.msg.map((x) => x[1]),
          encMessage.senderPubKey,
          {}
        )[0][1]

        console.log('decryptedMessage :>> ', decryptedMessage)
        directMessage.dmsg.push(decryptedMessage)
      })
    })

    await Promise.all([sentResult, receivedResult])

    console.log('directMessage :>> ', directMessage)

    const sendingDms = [...state.directMessage.dmsg].filter(
      (message) => message.isSending
    )

    directMessage.dmsg = directMessage.dmsg.concat(sendingDms)

    directMessage.dmsg.sort((a, b) => (a.$createdAt > b.$createdAt ? 1 : -1))

    // Deduplicate messages by $id
    directMessage.dmsg = directMessage.dmsg.filter(
      (message, idx, dmsg) =>
        dmsg.findIndex((msg) => msg.$id === message.$id) === idx
    )

    commit('setDirectMessage', directMessage)
  },
  async encryptReaction(
    { dispatch, state },
    { messageId, reactEmoji, chatPartnerUserName, chatPartnerUserId }
  ) {
    const dpnsChatPartner = await dispatch(
      'resolveUsername',
      chatPartnerUserName
    )
    console.log('dpnsChatPartner :>> ', dpnsChatPartner)

    const chatPartnerPubKeyDoc = await dispatch('queryDocuments', {
      dappName: 'primitives',
      typeLocator: 'Session',
      queryOpts: {
        limit: 1,
        startAt: 1,
        orderBy: [['$createdAt', 'desc']],
        where: [
          ['$ownerId', '==', dpnsChatPartner.records.dashUniqueIdentityId],
        ],
      },
    })

    const chatPartnerPubKey = chatPartnerPubKeyDoc[0].toJSON().pubKey

    console.log('chatPartnerPubKey :>> ', chatPartnerPubKey)

    // Retrieve receiver publickey of my main identity
    const mainIdentityPubKey = state.session.pubKey

    console.log('mainIdentityPubKey :>> ', mainIdentityPubKey)

    // Retrieve sender private key for tmp identity
    const acc = await client.wallet.getAccount({ index: 0 })

    const senderPrivKey = acc
      .getIdentityHDKeyByIndex(0, 0)
      .privateKey.toString()

    console.log('senderPrivKey :>> ', senderPrivKey)

    // Retrieve sender public key for tmp identity
    const senderPubKey = acc
      .getIdentityHDKeyByIndex(0, 0)
      .privateKey.publicKey.toBuffer()
      .toString('base64')

    console.log('senderPubKey :>> ', senderPubKey)

    const msg = dsm.encrypt(
      senderPrivKey,
      reactEmoji,
      [chatPartnerPubKey, mainIdentityPubKey],
      {}
    )
    // .toString('base64')

    console.log('msg :>> ', msg)

    const encMessageObj = { senderPubKey, msg }
    console.log('encMessageObj :>> ', encMessageObj)

    const encMessage = Buffer.from(JSON.stringify(encMessageObj)).toString(
      'base64'
    )

    console.log('encMessage :>> ', encMessage)

    dispatch('submitDocument', {
      contract: 'directmessage',
      type: 'reaction',
      doc: {
        messageId,
        emoji: encMessage,
        chatPartnerUserId,
      },
    })
  },
  async fetchReactions(
    { commit, dispatch, getters, state },
    { chatPartnerUserId, chatPartnerUserName, messageId }
  ) {
    const chatPartnerReactions = await dispatch('queryDocuments', {
      dappName: 'directmessage',
      typeLocator: 'reaction',
      queryOpts: {
        limit: 1,
        startAt: 1,
        orderBy: [['$createdAt', 'desc']],
        where: [
          [
            '$createdAt',
            '>',
            getters.getLastSeen('reaction-' + chatPartnerUserName),
          ],
          ['chatPartnerUserId', '==', chatPartnerUserId],
          ['messageId', '==', messageId],
        ],
      },
    })

    const myReactions = await dispatch('queryDocuments', {
      dappName: 'directmessage',
      typeLocator: 'reaction',
      queryOpts: {
        limit: 1,
        startAt: 1,
        orderBy: [['$createdAt', 'desc']],
        where: [
          [
            '$createdAt',
            '>',
            getters.getLastSeen('reaction-' + state.name.label),
          ],
          ['chatPartnerUserId', '==', state.name.userId],
          ['messageId', '==', messageId],
        ],
      },
    })

    const reactions = [...myReactions, ...chatPartnerReactions]

    const decryptedReactions = []
    reactions.forEach((element) => {
      const decryptedMessage = { ...element.toJSON() }

      const encMessage = JSON.parse(Buffer.from(element.data.emoji, 'base64'))

      decryptedMessage.emoji = dsm.decrypt(
        state.session.pvtKey,
        encMessage.msg.map((x) => x[1]),
        encMessage.senderPubKey,
        {}
      )[0][1]

      decryptedReactions.push(decryptedMessage)
    })

    decryptedReactions.forEach((reaction) => {
      commit('setReactions', {
        messageId: reaction.messageId,
        reaction: reaction.emoji,
      })
    })

    const newTimestampChatPartnerReactions =
      chatPartnerReactions.length > 0
        ? chatPartnerReactions[0].toJSON().$createdAt
        : 0

    const newTimestampMyReactions =
      myReactions.length > 0 ? myReactions[0].toJSON().$createdAt : 0

    commit('setLastSeen', {
      eventType: 'reactions-' + this.chatPartnerUserName,
      lastSeenTimestamp: newTimestampChatPartnerReactions,
    })

    commit('setLastSeen', {
      eventType: 'reactions-' + state.name.label,
      lastSeenTimestamp: newTimestampMyReactions,
    })

    return decryptedReactions
  },
  async sendDirectMessage(
    { commit, dispatch, state },
    { directMessageText, chatPartnerUserName, chatPartnerUserId }
  ) {
    // Retrieve receiver publickey of chatpartner
    const dpnsChatPartner = await dispatch(
      'resolveUsername',
      chatPartnerUserName
    )
    console.log('dpnsChatPartner :>> ', dpnsChatPartner)

    // const chatPartnerPubKey = (
    //   await client.platform.identities.get(
    //     dpnsChatPartner.records.dashUniqueIdentityId
    //   )
    // ).publicKeys[0].data.toString('base64')

    const chatPartnerPubKeyDoc = await dispatch('queryDocuments', {
      dappName: 'primitives',
      typeLocator: 'Session',
      queryOpts: {
        limit: 1,
        startAt: 1,
        orderBy: [['$createdAt', 'desc']],
        where: [
          ['$ownerId', '==', dpnsChatPartner.records.dashUniqueIdentityId],
        ],
      },
    })

    const chatPartnerPubKey = chatPartnerPubKeyDoc[0].toJSON().pubKey

    console.log('chatPartnerPubKey :>> ', chatPartnerPubKey)

    // Retrieve receiver publickey of my main identity
    const mainIdentityPubKey = state.session.pubKey

    console.log('mainIdentityPubKey :>> ', mainIdentityPubKey)

    // Retrieve sender private key for tmp identity
    const acc = await client.wallet.getAccount({ index: 0 })

    const senderPrivKey = acc
      .getIdentityHDKeyByIndex(0, 0)
      .privateKey.toString()

    console.log('senderPrivKey :>> ', senderPrivKey)

    // Retrieve sender public key for tmp identity
    const senderPubKey = acc
      .getIdentityHDKeyByIndex(0, 0)
      .privateKey.publicKey.toBuffer()
      .toString('base64')

    console.log('senderPubKey :>> ', senderPubKey)

    const msg = dsm.encrypt(
      senderPrivKey,
      directMessageText,
      [chatPartnerPubKey, mainIdentityPubKey],
      {}
    )
    // .toString('base64')

    console.log('msg :>> ', msg)

    const encMessageObj = { senderPubKey, msg }
    console.log('encMessageObj :>> ', encMessageObj)

    const encMessage = Buffer.from(JSON.stringify(encMessageObj)).toString(
      'base64'
    )

    console.log('encMessage :>> ', encMessage)
    // Prepare `type: dmsg` DirectMessage document
    const doc = {
      encMessage,
      senderUserId: state.name.userId,
      senderUserName: state.name.label,
      receiverUserId: chatPartnerUserId,
      receiverUserName: chatPartnerUserName,
    }

    console.log('doc :>> ', doc)

    const tmp$createdAt = Date.now()
    // const tmp$id = 'tmp_' + tmp$createdAt
    // commit('appendDirectMessageSending', {
    //   ...doc,
    //   $createdAt: tmp$createdAt,
    //   $id: tmp$id,
    //   isSending: true,
    // })
    console.log('sendDirectMessage doc :>> ', doc)

    try {
      // Init documents.broadcast batch array
      const createDocuments = []

      const identity = await client.platform.identities.get(
        client.account.getIdentityIds()[0]
      )

      // TODO documents.create is slow causing lag in chat UX (appendDirectMessageSending)
      const directMessageDocument = await client.platform.documents.create(
        `directmessage.dmsg`,
        identity,
        doc
      )

      console.log('created document :>> ', document)

      // commit('updateDirectMessageSending', {
      //   tmp$id,
      //   directMessage: directMessageDocument.toJSON(),
      // })

      commit('appendDirectMessageSending', {
        ...directMessageDocument.toJSON(),
        encMessage: directMessageText,
        $createdAt: tmp$createdAt,
        isSending: true,
      })

      // If the receiving contact is not on our contactlist we
      // send a `type: contacts` doc in batch
      const queryOptsContacts = {
        limit: 1,
        startAt: 1,
        where: [
          ['senderUserId', '==', state.name.userId],
          ['receiverUserId', '==', chatPartnerUserId],
        ],
      }

      // TODO cache contact list
      const contactsResult = await dispatch('queryDocuments', {
        dappName: 'directmessage',
        typeLocator: 'contacts',
        queryOpts: queryOptsContacts,
      })

      if (contactsResult.length === 0) {
        const contactDoc = {
          senderUserId: state.name.userId,
          receiverUserId: chatPartnerUserId,
          senderUserName: state.name.label,
          receiverUserName: chatPartnerUserName,
        }

        const contactDocument = await client.platform.documents.create(
          `directmessage.contacts`,
          identity,
          contactDoc
        )

        createDocuments.push(contactDocument)
      }

      createDocuments.push(directMessageDocument)

      const documentBatch = {
        // TODO phaseb add delegatedSignatures document and broadcast as batch
        create: createDocuments,
        replace: [],
        delete: [],
      }

      const result = await client.platform.documents.broadcast(
        documentBatch,
        identity
      )

      console.log('document submitted result :>> ', result)

      // Add newly contacted chartPartner to contactList state tree
      result.transitions.forEach((doc) => {
        if (doc.type === 'contacts') {
          commit('addContactToList', doc)
        }
      })
    } catch (e) {
      dispatch('showSnackbar', { text: e.message })
      console.error('Something went wrong:', e)
    }
    // const index = this.messages.findIndex((obj) => obj.$$createdAt === timeSent)
    // this.messages.splice(index, 1)
  },
  async resolveUsername({ state, commit }, userName) {
    const userNormalizedLabel = userName.toLowerCase()

    let dpnsDoc

    if (userNormalizedLabel in state.dpns) {
      dpnsDoc = state.dpns[userNormalizedLabel]

      console.log('Found existing cached dpns doc', dpnsDoc)
    } else {
      dpnsDoc = await client.platform.names.resolve(
        `${userNormalizedLabel}.dash`
      )

      console.log('Fetched unknown userName', userName, dpnsDoc)

      if (!dpnsDoc) return null
      dpnsDoc = dpnsDoc.toJSON()
      commit('setDPNSDoc', dpnsDoc)
    }
    console.log('dpnsDoc :>> ', dpnsDoc)
    return dpnsDoc
  },
  // query follows docType to get all the jammerId's this person is following

  async resolveOwnerIds({ commit }, ownerIds) {
    console.log('ownerIds :>> ', ownerIds)

    const uniqueIds = [...new Set(ownerIds)]

    console.log('uniqueIds :>> ', uniqueIds)

    const promises = uniqueIds.map((ownerId) =>
      client.platform.names.resolveByRecord('dashUniqueIdentityId', ownerId)
    )

    const dpnsDocs = await Promise.all(promises)

    const dpnsDocsJSON = dpnsDocs.map((dpnsDocs) => dpnsDocs[0].toJSON())

    dpnsDocsJSON.forEach((dpnsDoc) => {
      console.log('dpnsDoc :>> ', dpnsDoc)
      commit('setDPNSDoc', dpnsDoc)
    })

    return dpnsDocsJSON
  },
  // TODO handle multi chunk data
  async fetchFromDatastore({ dispatch }, blobHash) {
    const queryOpts = {
      limit: 1,
      startAt: 1,
      orderBy: [['$updatedAt', 'desc']],
      where: [['blobHash', '==', blobHash]],
    }
    const [doc] = await dispatch('queryDocuments', {
      dappName: 'datastore',
      typeLocator: 'datastore',
      queryOpts,
    })
    return doc.toJSON().blob
  },
  // TODO add hunk hash
  async saveToDatastore({ dispatch, state }, blob) {
    const blobHash = await sha256(blob)
    const chunkHash = await sha256(blob)

    const doc = {
      userId: state.name.userId,
      userNormalizedLabel: state.name.label.toLowerCase(),
      blobChunks: 1,
      chunk: 1,
      chunkHash,
      blobHash,
      blob,
    }
    await dispatch('submitDocument', {
      contract: 'datastore',
      type: 'datastore',
      doc,
    })
    return blobHash
  },
  fetchUserInfoForJams({ dispatch }, jams) {
    const uniqueUserNames = {}

    for (const jam of jams) {
      uniqueUserNames[jam._userName.toLowerCase()] = true
    }

    for (const userName in uniqueUserNames) {
      dispatch('fetchUserInfo', { userName })
    }
  },
  async fetchUserInfo({ dispatch, state }, { userName, forceRefresh = false }) {
    const userNormalizedLabel = userName.toLowerCase()

    // Don't refresh cached users unless forceRefresh is requested (avoid hitting DAPI with every jam list view)
    if (state.userSignups[userNormalizedLabel] && forceRefresh === false) {
      return
    }

    // const userId = getUserIdFromUserName(userName)
    // TODO cache dpns userIds
    const ownerId = (await dispatch('resolveUsername', userName)).$ownerId

    // console.log('fetchUserInfo result :>> ', result)

    // const userId = result.$id

    dispatch('fetchFollows', {
      followType: 'following',
      ownerId,
    })

    dispatch('fetchFollows', {
      followType: 'followers',
      ownerId,
    })

    // dispatch('fetchUserSignup', {
    //   userId,
    //   userName: userNormalizedLabel,
    // })

    dispatch('fetchProfile', userNormalizedLabel)
  },
  async fetchProfile({ dispatch, commit, getters }, userName) {
    console.log('fetch Profile userName :>> ', userName)
    if (!userName) debugger
    const storedProfile = getters.getProfile(userName)

    const queryOpts = {
      limit: 1,
      startAt: 1,
      orderBy: [['$updatedAt', 'desc']],
      where: [['userNormalizedLabel', '==', userName.toLowerCase()]],
    }

    const [doc] = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'profile',
      queryOpts,
    })

    // No profile found, nothing to do. return '' to avoid undefined errors
    if (!doc) return ''

    const profile = doc.toJSON()
    profile.avatarRaw = profile.avatar
    profile.themeRaw = profile.theme

    if (profile.avatarRaw === storedProfile.avatarRaw) {
      profile.avatar = storedProfile.avatar
    } else {
      profile.avatar = ''
    }

    if (profile.themeRaw === storedProfile.themeRaw) {
      profile.theme = storedProfile.theme
    } else {
      profile.theme = ''
    }

    commit('setProfile', { ...profile })

    if (profile.themeRaw !== '' && profile.theme === '') {
      dispatch('resolveAssetURI', profile.themeRaw).then((data) => {
        profile.theme = data
        commit('setProfile', { ...profile })
      })
    }

    if (profile.avatarRaw !== '' && profile.avatar === '') {
      dispatch('resolveAssetURI', profile.avatarRaw).then((data) => {
        profile.avatar = data
        commit('setProfile', { ...profile })
      })
    }
    return profile
  },
  resolveAssetURI({ dispatch }, URI) {
    // TODO use regexp to match and return http(s) / datastore / ipfs etc...
    if (URI) {
      const isDatastore = URI.split('datastore:')
      // isDatastore === ['',objectHash]
      if (isDatastore.length === 2 && isDatastore[0] === '') {
        const objectHash = isDatastore[1]
        return dispatch('fetchFromDatastore', objectHash)
      }
    }
  },
  async fetchUserSignup({ commit, dispatch }, { userId, userName }) {
    console.log('fetchUserSignup :>> ', { userId, userName })
    const queryOpts = {
      limit: 1,
      startAt: 1,
      orderBy: [['$createdAt', 'asc']],
      where: [
        ['accountDocId', '==', userId],
        ['isRegistered', '==', true],
      ],
    }

    const [result] = await dispatch('queryDocuments', {
      dappName: 'primitives',
      typeLocator: 'Signup',
      queryOpts,
    })

    console.log('result :>> ', result)
    if (result) {
      const doc = result.toJSON()
      const signupDate = new Date(doc.$createdAt)
      // TODO move months to central / shared plugin
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'April',
        'May',
        'June',
        'July',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ]
      const month = signupDate.getMonth()
      const year = signupDate.getFullYear()
      await commit('setUserSignup', {
        humanTime: `${months[month]} ${year}`,
        doc,
        userName,
        userId,
      })
    } else {
      console.error('Signup primitive not found for userId:', userId)
      await commit('setUserSignup', {
        humanTime: 'Never',
        doc: {},
        userName,
        userId,
      })
    }
  },
  async searchJembeNames({ dispatch }, searchString) {
    const queryOpts = {
      where: [['normalizedLabel', 'startsWith', searchString.toLowerCase()]],
      startAt: 1,
      limit: 4,
      orderBy: [['normalizedLabel', 'asc']],
    }
    try {
      const searchNames = await client.platform.documents.get(
        'primitives.Signup',
        queryOpts
      )
      console.log({ searchNames })
      // commit('setSearchNames', searchNames)
      return searchNames
    } catch (e) {
      dispatch('showSnackbar', { text: e.message })
      console.error('Something went wrong:', e)
    }
  },
  async searchDashNames({ dispatch }, searchString) {
    const queryOpts = {
      where: [
        ['normalizedParentDomainName', '==', 'dash'],
        ['normalizedLabel', 'startsWith', searchString.toLowerCase()],
      ],
      startAt: 1,
      limit: 4,
      orderBy: [['normalizedLabel', 'asc']],
    }
    try {
      const searchNames = await client.platform.documents.get(
        'dpns.domain',
        queryOpts
      )
      console.log({ searchNames })
      // commit('setSearchNames', searchNames)
      return searchNames
    } catch (e) {
      dispatch('showSnackbar', { text: e.message })
      console.error('Something went wrong:', e)
    }
  },
  async encryptRequestPin({ state }) {
    const { uidPin, tmpPrivKey, identityId } = state.name

    const userIdentity = await cachedOrGetIdentity(client, identityId)
    const userPubKey = userIdentity.publicKeys[0].data

    return encrypt(tmpPrivKey, uidPin, userPubKey)
  },
  async onboard({ state, commit, getters, dispatch }) {
    commit('setIsSyncing', true)
    switch (state.onboardType) {
      case 'signup':
        await dispatch('signupRequest', {})
        break
      case 'login':
        await dispatch('sessionRequest', {})
        break

      default:
        break
    }
  },
  async login({ commit }) {
    const result = await Connect.connect()

    console.log('login result :>> ', result)

    const accountDPNS = result.payload

    commit('setAccountDPNS', accountDPNS)

    this.$router.push('/discover')
  },
  async sendJam(
    { dispatch, state },
    { jamText, replyToJamId = '', reJamId = '' }
  ) {
    const contractId = client.getApps().apps.jembe.contractId.toString()
    const metaId = new ObjectID().toString()
    console.log('metaId :>> ', metaId)

    const tags = linkify
      .find(jamText, 'hashtag')
      .map((x) => x.value.substring(1))

    console.log('tags', tags)

    const mentions = linkify.find(jamText, 'mention')
    console.log('mentions :>> ', mentions)

    // TODO implement error handling for non-existing users
    const mentionedUsers = await Promise.all(
      mentions
        .filter((m) => m.type === 'mention')
        .map((m) => dispatch('resolveUsername', m.value.substring(1)))
    )

    const mentionedOwnerIds = mentionedUsers.map((m) => (m ? m.$ownerId : null))

    const mentionedOwnerIdsExist = mentionedOwnerIds.filter((m) => m != null)

    const jamDocProperties = {
      text: jamText,
      replyToJamId,
      reJamId,
      mentionedOwnerIds: mentionedOwnerIdsExist,
      tags,
      metaId,
      $type: 'jams',
      $dataContractId: contractId,
    }

    console.log('jamDocProperties :>> ', jamDocProperties)

    const jamDoc = jamDocProperties
    // const jamDoc = (
    //   await Connect.createDocument({
    //     typeLocator: `${contractId}.jams`,
    //     document: jamDocProperties,
    //   })
    // ).payload

    // Convert tags array to individual documents for the jeme.tags doctype,
    // this serves as an index for querying jams filtered by tags

    const tagsDocProperties = []

    tags.forEach((value, index, array) => {
      console.log('tag value :>> ', value)
      if (value == null) return

      const tagDocProperties = {
        tag: value,
        opOwnerId: state.accountDPNS.$ownerId,
        jamId: metaId,
        index,
        $type: 'tags',
        $dataContractId: contractId,
      }

      console.log('tagsDocProperties :>> ', tagsDocProperties)

      //   const tDocPromise = Connect.createDocument({
      //     typeLocator: `${contractId}.tags`,
      //     document: tagDocProperties,
      //   })

      // tagsDocProperties.push(tDocPromise)
      tagsDocProperties.push(tagDocProperties)
    })

    // const tagsDocs = (await Promise.all(tagsDocProperties)).map(
    //   (x) => x.payload
    // )
    const tagsDocs = tagsDocProperties

    console.log('tagsDocs :>> ', tagsDocs)

    // Convert mentionedUserIds array to individual documents for the jeme.mentions doctype,
    // this serves as an index for querying jams filtered by mentions

    const mentionsDocProperties = []

    mentionedOwnerIds.forEach((value, index, array) => {
      console.log('value :>> ', value)
      if (value == null) return

      const mDocProperties = {
        mentionedOwnerId: jamDocProperties.mentionedOwnerIds[index],
        opOwnerId: state.accountDPNS.$ownerId,
        jamId: metaId,
        index,
        $type: 'mentions',
        $dataContractId: contractId,
      }

      console.log('mDocProperties :>> ', mDocProperties)

      //   const mDocPromise = client.platform.documents.create(
      //     'jembe.mentions',
      //     identity,
      //     mDocProperties
      //   )

      // mentionsDocProperties.push(mDocPromise)
      mentionsDocProperties.push(mDocProperties)
    })

    // const mentionsDocs = await Promise.all(mentionsDocProperties)
    const mentionsDocs = mentionsDocProperties

    console.log('mentionsDocs :>> ', mentionsDocs)

    // Submit Jam and additional mentions and tags docs (as indices) in a batch transition
    const documents = [].concat(jamDoc, ...mentionsDocs, ...tagsDocs)
    // const documents = [].concat(jamDoc, ...tagsDocs)

    console.log('documents :>> ', documents)

    const documentBatch = {
      create: documents,
      replace: [],
      delete: [],
    }

    // const contractId = client.getApps().apps.jembe.contractId.toString()

    // const createdDocument = (
    //   await Connect.createDocument({
    //     typeLocator: typeLocatorById,
    //     document: jamDocProperties,
    //   })
    // ).payload

    // console.log('createdDocument :>> ', createdDocument)

    // const documentBatch = {
    //   create: [createdDocument],
    //   replace: [],
    //   delete: [],
    // }
    console.log('documentBatch in jembe :>> ', documentBatch)
    const broadcastDocumentBatch = await Connect.broadcastDocumentBatch({
      documentBatch,
    })

    console.log('broadcastDocumentBatch :>> ', broadcastDocumentBatch)
  },
  async sendJamAndRefreshJams(
    { dispatch },
    { jamText, replyToJamId = '', reJamId = '', view = '/discover' }
  ) {
    await dispatch('sendJam', {
      jamText,
      replyToJamId,
      reJamId,
      view,
    })

    // // TODO remove orderBy ASC case when switching to fetching deltas, order the view instead
    const orderBy = [['$createdAt', 'desc']]
    // // In case of a thread conversation, sort oldest first

    // if (view.includes('/status/')) {
    // orderBy = [['$createdAt', 'asc']]
    // await dispatch('fetchReplyThread', {
    // view,
    // jamId: replyToJamId,
    // })
    // } else {
    await dispatch('fetchJams', { view, orderBy })
    // }
  },
  async likeJam({ dispatch, state }, { jamId, isLiked = true, opOwnerId }) {
    const like = {
      jamId,
      isLiked,
    }
    console.log('like :>> ', like)
    console.log(JSON.stringify(like))
    await dispatch('submitDocument', {
      typeLocator: 'jembe.likes',
      document: like,
    })
  },
  async followJammer(
    { dispatch, state, commit },
    { jammerId, isFollowing = true }
  ) {
    const follow = {
      jammerId,
      isFollowing,
    }
    await dispatch('submitDocument', {
      typeLocator: 'jembe.follows',
      document: follow,
    })

    // Updates the "followers" count in the profile view
    dispatch('fetchFollows', {
      followType: 'followers',
      ownerId: jammerId,
    })

    // Updates the "followin" count
    commit('setiFollow', { jammerId, isFollowing })
  },
  // eslint-disable-next-line no-unused-vars
  async sendDash({ dispatch, state }, { amount }) {
    const encUidPin = await dispatch('encryptRequestPin')

    const tip = {
      uidPin: encUidPin.data,
      dappName: $dappName,
      satoshis: parseInt(amount).toString(), // MUST DO use dashcore to btc -> satoshis, FUTURE will be integer
      toAddress: 'yUADixXnWbrUD9PxUXFYUMwkMZxZH4u3hZ', // MUST DO resolve jamId -> jammerId -> identity -> publickey -> address
      contractId: client.getApps().get('jembe').contractId.toString(),
      accountDocId: state.name.userId, // FUTURE Userid
    }
    await dispatch('submitDocument', {
      contract: 'primitives',
      type: 'PaymentRequest',
      doc: tip,
    })
  },
  async signupRequest({ dispatch, state }, { isRegistered = true }) {
    const payload = {
      Signup: {
        dappIcon: $dappIcon,
        dappName: $dappName,
        contractId: client.getApps().get('jembe').contractId.toString(),
        accountDocId: state.name.userId,
        isRegistered,
      },
    }
    await dispatch('documentActionRequest', {
      payload,
    })
  },
  async sessionRequest({ dispatch }) {
    const payload = {
      Session: {
        delegateIdentityId: '$fill', // Filled by PW
        pubKey: '$fill', // Filled by PW
        encPvtKey: '$fill', // Filled by PW
      },
    }
    // TODO should be it's own request type
    await dispatch('documentActionRequest', {
      payload,
    })
  },
  // eslint-disable-next-line no-unused-vars
  async documentActionRequest(
    { dispatch, state },
    { action = 'create', payload }
  ) {
    const encUidPin = await dispatch('encryptRequestPin')

    console.log(encUidPin.data)
    const doc = {
      action,
      uidPin: encUidPin.data,
      dappName: $dappName,
      contractId: client.getApps().get('jembe').contractId.toString(),
      accountDocId: state.name.userId,
      JSONDocString: JSON.stringify(JSON.stringify(payload)).slice(1, -1),
    }
    // MUST DO check for valid json payload
    await dispatch('submitDocument', {
      contract: 'primitives',
      type: 'DocumentActionRequest',
      doc,
    })
  },
  // eslint-disable-next-line no-unused-vars
  async fetchReplyThread({ dispatch, commit }, { view, jamId }) {
    const jams = []

    // Fetch root jam
    console.log('fetchReplyThread()', { view, jamId })
    let queryOpts = {
      startAt: 1,
      limit: 1,
      where: [['$id', '==', jamId]],
    }

    const [rootResult] = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'jams',
      queryOpts,
    })

    const rootJam = rootResult
    jams.push(rootJam)
    console.log('jams rootJam :>> ', jams)

    // Fetch context jam root itself is an answer
    console.log('fetchReplyThread() fetch context', { view, rootJam })
    if (rootJam.replyToJamId !== '') {
      const queryOpts = {
        startAt: 1,
        limit: 1,
        where: [['$id', '==', rootJam.replyToJamId]],
      }

      const [contextResult] = await dispatch('queryDocuments', {
        dappName: 'jembe',
        typeLocator: 'jams',
        queryOpts,
      })

      const contextJam = contextResult
      console.log('contextJam :>> ', contextJam)

      // Add context to the beginning of the conversation
      jams.unshift(contextJam)
      console.log('jams contextJam :>> ', jams)
    }

    // Fetch comments
    queryOpts = {
      startAt: 1,
      limit: 100,
      orderBy: [['$createdAt', 'asc']],
      where: [['replyToJamId', '==', jamId]],
    }

    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'jams',
      queryOpts,
    })

    // const comments = result.map((jam) => jam.toJSON())

    jams.push(...result)
    console.log('jams comments :>> ', jams)

    await commit('setJams', { view, jams })
    // dispatch('refreshLikesInState', { view })
    // dispatch('refreshRejamCountInState', { view })
    // dispatch('refreshCommentCountInState', { view })
    // dispatch('fetchUserInfoForJams', jams)
  },
  // TODO remove, deprecated
  // removeOtherJams({ state, commit }, jamId) {
  //   const jams = state.jams.filter((jam) => jam.$id === jamId)
  //   commit('setJams', jams)
  // },
  async fetchJamIdsByTag({ dispatch }, { tag, byUserId = undefined }) {
    // Resolve userName to DPNS id
    console.log('fetchJamIdsByTag', { tag })

    const queryOpts = {
      limit: 10,
      startAt: 1,
      where: [
        // ['reJamId', '==', ''],
        ['tag', '==', tag],
      ],
    }

    // Seach includes `from: username` option
    if (byUserId) {
      queryOpts.where.push(['$ownerId', '==', byUserId])
    }

    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'tags',
      queryOpts,
    })
    console.log('result :>> ', result)
    return result.map((x) => x.jamId)
  },
  async fetchJamsByUser({ dispatch }, { view, userName, showReplies = false }) {
    // Resolve userName to DPNS id
    console.log('fetchJamsByUser', { view, userName, showReplies })

    const doc = (
      await client.platform.names.resolve(`${userName}.dash`)
    ).toJSON() // TODO cache dpns
    console.log('dpnsDoc :>> ', doc)
    const dpnsId = doc.$id

    // Construct filter conditions for query..
    const where = [['userId', '==', dpnsId]]

    // ..add condition to only show root jams
    if (!showReplies) {
      where.push(['replyToJamId', '==', ''])
    }
    console.log('where :>> ', where)
    await dispatch('fetchJams', {
      view,
      orderBy: [['$createdAt', 'desc']],
      where,
    })
  },
  // TODO remove MetaId and revert to $id when the sdk supports static $ids on Document creation
  async fetchJamByMetaId({ state, dispatch, commit }, jamMetaId) {
    // if (state.jamsById[jamId]) return { ...state.jamsById[jamId] }

    console.log('jamMetaId :>> ', jamMetaId)
    const queryOpts = {
      limit: 1,
      startAt: 1,
      where: [['metaId', '==', jamMetaId]],
    }
    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'jams',
      queryOpts,
    })
    // const jam = result.map((jam) => jam.toJSON())
    console.log('jam 0', result[0])
    commit('setJamById', result[0])
    return { ...result[0] }
  },
  async fetchJamById({ state, dispatch, commit }, jamId) {
    if (state.jamsById[jamId]) return { ...state.jamsById[jamId] }

    console.log('jamId :>> ', jamId)
    const stringJamId = jamId.toString()
    const queryOpts = {
      limit: 1,
      startAt: 1,
      where: [['$id', '==', stringJamId]],
    }
    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'jams',
      queryOpts,
    })
    // const jam = result.map((jam) => jam.toJSON())
    console.log('jam 0', result[0])
    commit('setJamById', result[0])
    return { ...result[0] }
  },
  // TODO only fetch Jams newer than most recent jam
  async fetchJams( // fetchJamsByView
    { dispatch, commit },
    { view, orderBy = undefined, where = undefined }
  ) {
    console.log('fetchJams(),view', view, 'orderBy', orderBy)

    const queryOpts = {
      startAt: 1,
      limit: 100,
      orderBy,
      // where,
    }
    console.log('queryOpts :>> ', queryOpts)

    const jams = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'jams',
      queryOpts,
    })

    // Resolve jams that have reJam content concurrently
    const promisedJams = jams.map(async (jam) => {
      if (jam.reJamId !== '') {
        const reJam = await dispatch('fetchJamById', jam.reJamId)
        reJam.reJamByOwnerId = jam.$ownerId
        reJam.$id = jam.$id
        return reJam
      } else {
        return jam
      }
    })

    const resolvedJams = await Promise.all(promisedJams)

    console.dir(resolvedJams, { depth: 100 })

    // commit('setJams', { view, jams })
    commit('setJams', { view, jams: resolvedJams })

    // dispatch('refreshLikesInState', { view })
    // dispatch('refreshCommentCountInState', { view })
    // dispatch('refreshRejamCountInState', { view })
    // dispatch('fetchUserInfoForJams', resolvedJams)
  },

  // TODO remove default /discover once undefined caller is found
  refreshLikesInState({ state, dispatch, getters }, { view = '/discover' }) {
    // console.log('refreshLikesInState()', { view })
    // console.log(state.jams[view])
    // await Promise.all(
    // state.jams[view].map((jam) => {
    //   dispatch('countLikes', { jamId: jam.$id })
    // })
    // )
    for (const jam in state.jams[view]) {
      console.log('state.jams[view][jam].$id :>> ', state.jams[view][jam].$id)
      console.log('jam :>> ', jam)
      console.log('view :>> ', view)
      console.log('state.jams[view] :>> ', state.jams[view])
      const jamId = state.jams[view][jam].$id
      console.log('jamId :>> ', jamId)
      // eslint-disable-next-line no-throw-literal
      if (jamId === undefined) throw 'jamid undefined in refreshlikesinstate'
      dispatch('countLikes', { jamId })
    }
  },
  refreshRejamCountInState({ state, dispatch }, { view = '/discover' }) {
    for (const idx in state.jams[view]) {
      console.log('refresh comments: jam :>> ', idx)
      // Don't dispatch countRejams for rejam entries to avoid double counting
      if (!state.jams[view][idx].reJamByOwnerId) {
        // console.log('{ jamId: state.jams[view][jam].$id } :>> ', {
        //   jamId: state.jams[view][idx].$id,
        // })
        dispatch('countRejams', { jamId: state.jams[view][idx].$id })
      }
    }
  },
  refreshCommentCountInState({ state, dispatch }, { view = '/discover' }) {
    console.log('refreshCommentCountInState()', { view })
    // await Promise.all(
    // state.jams[view].map((jam) => {
    //   dispatch('countLikes', { jamId: jam.$id })
    // })
    // )
    for (const idx in state.jams[view]) {
      // console.log('refresh comments: jam :>> ', idx)
      // Don't dispatch countComments for rejam entries to avoid double counting
      if (!state.jams[view][idx].reJamByOwnerId) {
        // console.log('{ jamId: state.jams[view][jam].$id } :>> ', {
        //   jamId: state.jams[view][idx].$id,
        // })
        dispatch('countComments', { jamId: state.jams[view][idx].$id })
      }
    }
  },
  async countRejams({ dispatch, commit, state }, { jamId }) {
    // Recursive, async fun !
    console.log('countRejams()')

    // Read existing rejams from state or initialize new object
    const rejamsCount = state.rejamsCount[jamId]
      ? state.rejamsCount[jamId]
      : { jamId, rejams: 0, refreshedAt: 0 }

    console.log('rejamsCount :>> ', rejamsCount)

    const queryOpts = {
      startAt: 1,
      limit: 100,
      orderBy: [['$createdAt', 'asc']],
      where: [
        ['reJamId', '==', jamId],
        ['$createdAt', '>', rejamsCount.refreshedAt],
      ],
    }
    console.log('rejamsCount queryOpts :>> ', queryOpts)

    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'jams',
      queryOpts,
    })
    console.log('rejams result', result)

    // If no results, return early
    if (result.length === 0) {
      await commit('setRejams', rejamsCount) // Setting no results will tell the view that data fetching is complete and change the counter: ? -> 0
      return
    }

    // Set timestamp of most recent rejams to only fetch newer rejams in the future
    const mostRecentRejam = result[result.length - 1].toJSON()
    rejamsCount.refreshedAt = mostRecentRejam.$createdAt

    // Add newly found rejams to tally
    rejamsCount.rejams += result.length

    await commit('setRejams', rejamsCount)

    // Recursively call `countRejams()` if there are more docs than the queryLimit allowed to fetch
    if (result.length === queryOpts.limit) {
      dispatch('countRejams', { jamId })
    }
  },
  // eslint-disable-next-line no-unused-vars
  async countComments({ dispatch, commit, state }, { jamId }) {
    // Recursive, async fun !
    console.log('countComments()')

    // Read existing comments from state or initialize new object
    const commentsCount = state.commentsCount[jamId]
      ? { ...state.commentsCount[jamId] }
      : { jamId, comments: 0, refreshedAt: 0 }

    console.log('commentsCount :>> ', commentsCount)

    const queryOpts = {
      startAt: 1,
      limit: 100,
      orderBy: [['$createdAt', 'asc']],
      where: [
        ['replyToJamId', '==', jamId],
        ['reJamId', '==', ''],
        ['$createdAt', '>', commentsCount.refreshedAt],
      ],
    }
    console.log('comments queryOpts :>> ', queryOpts)

    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'jams',
      queryOpts,
    })

    console.log('comments result', result)

    // No comments to count, exit function early
    if (result.length === 0) {
      await commit('setComments', commentsCount)
      return
    }

    // Set timestamp of most recent comment to only fetch newer comments in the future
    const mostRecentComment = result[result.length - 1]
    commentsCount.refreshedAt = mostRecentComment.$createdAt

    // Add newly found comments to tally
    commentsCount.comments += result.length

    await commit('setComments', commentsCount)

    // Recursively call `countComments()` if there are more docs than the queryLimit allowed to fetch
    if (result.length === queryOpts.limit) {
      dispatch('countComments', { jamId })
    }
  },
  async fetchFollows({ dispatch, commit, state }, { followType, ownerId }) {
    // Load follows object from state if exists or init new object
    const storedFollows = state.follows[followType][ownerId]
    console.log('storedFollows :>> ', storedFollows)
    const follows = storedFollows
      ? { ...storedFollows }
      : { docs: [], refreshedAt: 0 }
    console.log('follows :>> ', follows)

    // Set query field depending on follow direction
    let queryUserParam
    let storeUserParam

    if (followType === 'following') {
      queryUserParam = '$ownerId'
      storeUserParam = 'jammerId'
    } else if (followType === 'followers') {
      queryUserParam = 'jammerId'
      storeUserParam = '$ownerId'
    }

    const queryOpts = {
      startAt: 1,
      limit: 100,
      orderBy: [['$updatedAt', 'asc']],
      where: [
        // queryUserParam: userId || jammerId == ownerId
        [queryUserParam, '==', ownerId],
        ['$updatedAt', '>', follows.refreshedAt],
      ],
    }

    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'follows',
      queryOpts,
    })
    // if (followType === 'following') debugger
    // No follows docs, set state to resolve loading indicator and return early
    if (result.length === 0) {
      commit('setFollows', { follows, followType, ownerId })
      return
    }

    // result = result.map((follow) => follow.toJSON())

    const deduplicatedResult = {}
    console.log('follow result :>> ', result)
    result.forEach((follow) => {
      // console.log('follow :>> ', follow)
      // console.log('storeUserParam :>> ', storeUserParam)
      deduplicatedResult[follow[storeUserParam]] = {
        isFollowing: follow.isFollowing,
      }
    })
    console.log('follow deduplicatedResult: :>> ', deduplicatedResult)

    // All follows docs found since the previous fetch are removed from the cache
    const removeItems = Object.keys(deduplicatedResult)
    console.log('removeItems :>> ', removeItems)

    const newItems = follows.docs.filter((follow) => {
      console.log('newItems follow :>> ', follow)
      // TODO test this clause
      return !removeItems.includes(follow)
    })
    console.log('newItems after checking against removeItems :>> ', newItems)

    // Follow docs with `isFollowing: true` are appended to the cache
    Object.keys(deduplicatedResult).forEach((uid) => {
      if (deduplicatedResult[uid].isFollowing) {
        newItems.push(uid)
      }
    })
    console.log('newItems :>> ', newItems)

    follows.docs = newItems

    console.log('follows :>> ', follows)
    // Set timestamp of most recent follows to only fetch newer ones in the future
    const mostRecent = result[result.length - 1]
    follows.refreshedAt = mostRecent.$updatedAt

    commit('setFollows', { follows, followType, ownerId })

    // Recursively call `fetchFollows()` if there are more docs than the queryLimit allowed to fetch
    // TODO test if dispatching after committing maintains reactivity
    if (result.length === queryOpts.limit) {
      dispatch('fetchFollows', { followType, ownerId })
    }
    return follows
  },
  // eslint-disable-next-line no-unused-vars
  async countLikes({ dispatch, commit, state }, { jamId }) {
    // Recursive, async fun !
    console.log('countLikes()')
    // Read existing likes from state or initialize new object
    const likesCount = state.likesCount[jamId]
      ? { ...state.likesCount[jamId] }
      : {
          jamId,
          likes: 0,
          iLiked: false,
          refreshedAt: 0,
        }

    console.log('countLikes start likesCount :>> ', likesCount)

    const queryOpts = {
      startAt: 1,
      limit: 100,
      orderBy: [['$updatedAt', 'asc']],
      where: [
        ['jamId', '==', jamId],
        ['$updatedAt', '>', likesCount.refreshedAt],
      ],
    }
    console.log('countLikes queryOpts :>> ', queryOpts)

    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'likes',
      queryOpts,
    })

    if (result.length === 0) {
      console.log('likesCount :>> ', likesCount)
      console.dir(likesCount)
      await commit('setLikes', likesCount)
      return
    }

    // Set timestamp of most recent like to only fetch newer likes in the future
    const mostRecentLike = result[result.length - 1].toJSON()
    likesCount.refreshedAt = mostRecentLike.$createdAt

    // Find my own likes and save the isLike true|false state for my most recent like document
    result.forEach((like) => {
      like = like.toJSON()
      // console.log('like :>> ', like)
      // console.log('like.userId :>> ', like.userId)
      // console.log('state.name.userId :>> ', state.name.userId)
      if (like.userId === state.name.userId) {
        likesCount.iLiked = like.isLiked
      }
    })

    console.log('likesCount result :>> ', result)
    // Get the count for likes and unlikes (array.length) of the 'like' docs, sorted by $createdAt
    const liked = result.filter((jam) => jam.toJSON().isLiked === true).length
    const notLiked = result.filter((jam) => jam.toJSON().isLiked === false)
      .length

    console.log('countLikes liked :>> ', liked)
    console.log('countLikes notLiked :>> ', notLiked)
    // Net positive likes without unLikes
    likesCount.likes += liked - notLiked

    console.log('likesCount after change :>> ', likesCount)
    console.dir(likesCount)
    await commit('setLikes', likesCount)

    // Recursively call `countLikes()` if there are more docs than the queryLimit allowed to fetch
    if (result.length === queryOpts.limit) {
      dispatch('countLikes', { jamId })
    }
  },

  // eslint-disable-next-line no-unused-vars
  async isSignedUp({ dispatch }, { userId }) {
    console.log('isSignedUp()', { userId })
    const queryOpts = {
      startAt: 1,
      limit: 1,
      orderBy: [['$createdAt', 'desc']],
      where: [['accountDocId', '==', userId]],
    }
    const dappName = 'primitives'
    const typeLocator = 'Signup'

    const [result] = await dispatch('queryDocuments', {
      dappName,
      typeLocator,
      queryOpts,
    })

    console.log('result :>> ', result)

    let isSignedUp
    if (result) {
      isSignedUp = result.toJSON().isRegistered
    } else {
      isSignedUp = false
    }

    // commit('setSignups', signupsJSON)
    console.log({ isSignedUp })
    console.log('isSignedUp :>> ', isSignedUp)
    return isSignedUp
  },

  async getSession({ dispatch }, { userId }) {
    console.log('getSession()', { userId })
    const queryOpts = {
      startAt: 1,
      limit: 1,
      orderBy: [['expiresAt', 'desc']],
      where: [['delegateIdentityId', '==', userId]],
    }

    const dappName = 'primitives'
    const typeLocator = 'Session'

    const [result] = await dispatch('queryDocuments', {
      dappName,
      typeLocator,
      queryOpts,
    })

    console.log('result :>> ', result)
    // MUST DO decrypt privkey here

    // commit('setSignups', signupsJSON)
    console.log('delCred :>> ', result)
    return result ? result.toJSON() : result
  },

  // eslint-disable-next-line no-unused-vars
  async submitDocuments(
    // eslint-disable-next-line no-unused-vars
    { commit, dispatch, state },
    { contract = 'jembe', type, docs }
  ) {
    console.log('submitting documents', type, docs)

    const { platform } = client

    try {
      const identity = await platform.identities.get(
        client.account.getIdentityIds()[0]
      )

      const docPromises = docs.map((doc) =>
        platform.documents.create(`${contract}.${type}`, identity, doc)
      )

      const documents = await Promise.all(docPromises)

      console.log('created documents :>> ', documents)

      const documentBatch = {
        // TODO phaseb add delegatedSignatures document and broadcast as batch
        create: documents,
        replace: [],
        delete: [],
      }

      const result = await platform.documents.broadcast(documentBatch, identity)

      console.log('document submitted result :>> ', result.toJSON())

      return result
    } catch (e) {
      dispatch('showSnackbar', { text: e.message })
      console.error('Something went wrong:', e)
    }
  },
  async fetchDappState({ commit, dispatch, state, getters }) {
    const queryOpts = {
      limit: 1,
      startAt: 1,
      orderBy: [['$updatedAt', 'desc']],
      where: [['userId', '==', state.name.userId]],
    }
    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'state',
      queryOpts,
    })
    if (result[0]) {
      // console.log('fetchDappState result :>> ', result[0])
      // console.log('fetchDappState result data.state:>> ', result[0].data.state)
      const base64 = Buffer.from(result[0].data.state, 'base64').toString(
        'ascii'
      )
      // console.log('dappstate base64 :>> ', base64)

      const fetchedState = JSON.parse(base64)
      // console.log('dappstate state :>> ', fetchedState)

      const dmTimes = {}
      fetchedState.otherDirectMessageTimestamps.forEach((el) => {
        console.log('dappstate el :>> ', el)
        dmTimes[el[0]] = el[1]
      })

      // console.log('dmTimes :>> ', dmTimes)

      getters.getContactListNames.forEach((name) => {
        console.log('dappstate looping to commit contacts', name)
        const nName = name.toLowerCase()

        let timestamp

        if (Object.keys(dmTimes).includes(nName)) {
          timestamp = dmTimes[nName]
          delete dmTimes[nName]
        } else {
          timestamp = fetchedState.lastDirectMessageTimestamp
        }
        commit('setLastSeenDirectMessage', {
          chatPartnerUserName: nName,
          timestamp,
        })
      })
      // console.log('dappstate not applied other', dmTimes)
      Object.keys(dmTimes).forEach((name) => {
        commit('setLastSeenDirectMessage', {
          chatPartnerUserName: name.toLowerCase(),
          timestamp: dmTimes[name],
        })
      })
    }
  },
  async saveDappState({ commit, dispatch, state, getters }) {
    console.log('dappstate saveDappState()')
    // FIXME store userId instead of userName to dpp
    const contactList = []

    // eslint-disable-next-line no-unused-vars
    for (const [userIds, contactDoc] of Object.entries(state.contactList)) {
      // console.log('contactDoc :>> ', contactDoc)
      const contact =
        contactDoc.senderUserId === state.name.userId
          ? [
              contactDoc.receiverUserId,
              contactDoc.receiverUserName,
              contactDoc.$createdAt,
            ]
          : [
              contactDoc.senderUserId,
              contactDoc.senderUserName,
              contactDoc.$createdAt,
            ]

      contactList.push(contact)
    }

    // console.log('dappstate contactListNames :>> ', contactList)

    const contactListLastSeen = contactList.map((contact) => [
      contact[1],
      state.dappState.lastSeen[contact[1]] || contact[2],
    ])

    const lastIndex = state.directMessage.dmsg.length - 1

    // eslint-disable-next-line no-unused-vars
    const lastDirectMessageTimestamp =
      state.directMessage.dmsg[lastIndex].$createdAt

    const contactListLastSeenFiltered = contactListLastSeen.filter(
      (el) => el[1] < lastDirectMessageTimestamp
    )

    console.log(
      'dappstate contactListLastSeenFiltered :>> ',
      contactListLastSeenFiltered
    )

    const dappState = {
      lastDirectMessageTimestamp,
      otherDirectMessageTimestamps: contactListLastSeenFiltered,
    }

    const base64 = Buffer.from(JSON.stringify(dappState)).toString('base64')

    console.log('dappstate base64 :>> ', base64)

    const doc = { userId: state.name.userId, state: base64 }

    const result = await dispatch('submitDocument', {
      contract: 'jembe',
      type: 'state',
      doc,
    })
    console.log('saveDappState result :>> ', result)
  },
  async submitDocument({ dispatch }, { typeLocator, document }) {
    console.log('submitDocument', document, typeLocator)

    const [contractName, docType] = typeLocator.split('.')

    console.log('contractName,docType :>> ', contractName, docType)
    try {
      const contractId = client
        .getApps()
        .apps[contractName].contractId.toString()

      const typeLocatorById = `${contractId}.${docType}`

      console.log('typeLocatorById :>> ', typeLocatorById)

      const result = await Connect.broadcastDocument({
        typeLocator: typeLocatorById,
        document,
      })

      console.log('document submitted result :>> ', result)

      return result
    } catch (e) {
      dispatch('showSnackbar', { text: e.message })
      console.error('Something went wrong:', e)
    }
  },
  // getCurPubKey() {
  //   const curIdentityHDKey = client.account.getIdentityHDKey(0, 'user')
  //   console.log({ publicKeyString: curIdentityHDKey.publicKey.toString() })

  //   const publicKey = curIdentityHDKey.publicKey.toString()
  //   return publicKey
  // },
  async syncSession({ dispatch, state, commit, getters }) {
    const identityId = client.account.getIdentityIds()[0]
    console.log('identityId :>> ', identityId)

    // Can't sync before we create or recover an identityId
    if (!identityId) return
    commit('setLoadingStep', 2)

    const dappName = 'primitives'
    const typeLocator = 'Session'
    const queryOpts = {
      limit: 1,
      startAt: 1,
      orderBy: [['expiresAt', 'desc']],
      where: [
        ['sessionIdentityId', '==', identityId],
        ['expiresAt', '>', process.env.STAY_LOGGED_IN ? 0 : timestamp()], // TODO deploy, enable credential check
        // ['expiresAt', '>', 0],
      ],
    } // TODO need to filter for contractId and userId as well, check for isValid

    console.log('syncSession', {
      dappName,
      typeLocator,
      queryOpts,
    })
    const result = await dispatch('queryDocuments', {
      dappName,
      typeLocator,
      queryOpts,
    })
    // console.log('result :>> ', result)
    const session = result && result[0] ? result[0].toJSON() : undefined
    console.log('session :>> ', session)

    // Decrypt the decryption private key for DirectMessages
    // FIXME move decryption key to Identity
    // const acc = await client.wallet.getAccount({ index: 0 })
    // const tmpPrivKey = acc.getIdentityHDKeyByIndex(0, 0).privateKey.toString()
    // const tmpPubKey = acc
    //   .getIdentityHDKeyByIndex(0, 0)
    //   .privateKey.publicKey.toBuffer()
    //   .toString('base64')

    // console.log('tmpPrivKey, tmpPubKey :>> ', tmpPrivKey, tmpPubKey)

    const alreadyHasSession = getters.hasSession
    if (session) {
      const receiverPrivKey = client.account
        .getIdentityHDKeyByIndex(0, 0)
        .privateKey.toString()

      const senderPubKey = (
        await client.platform.identities.get(session.$ownerId)
      ).publicKeys[0].data

      console.log(
        'receiverPrivKey, senderPubKey :>> ',
        receiverPrivKey,
        senderPubKey
      )

      session.pvtKey = decrypt(
        receiverPrivKey,
        session.encPvtKey,
        senderPubKey
      ).data

      if (!alreadyHasSession) {
        await dispatch('fetchContactlist', { userId: state.name.userId })
        await dispatch('fetchDappState')
      }
    }
    commit('setSession', { session })
    // Only load dappState if this is the first session sync / login
  },
  async fetchSignups({ dispatch, commit, getters }) {
    console.log('fetchSignups()')
    const queryOpts = {
      startAt: 1,
      limit: 5, // TODO fix select DISTINCT problem and paginate dApps
      orderBy: [['$createdAt', 'desc']],
      where: [['accountDocId', '==', getters.curAccountDocId]],
    }
    const dappName = 'primitives'
    const typeLocator = 'Signup'

    const signups = await dispatch('queryDocuments', {
      dappName,
      typeLocator,
      queryOpts,
    })
    const signupsJSON = signups.map((signup) => {
      return signup.toJSON()
    })
    console.log({ signupsJSON })
    commit('setSignups', signupsJSON)
  },

  async initOrCreateAccount({ commit, dispatch, state }) {
    await dispatch('initWallet', {}) // TODO replace with dash connect
  },
  resetStateKeepAccounts({ state, commit }) {
    console.log({ state })
    console.log(state.accounts)
    const { accounts } = state
    console.log({ accounts })
    const initState = getInitState()
    console.log({ initState })
    initState.accounts = accounts
    console.log({ initState })
    commit('setState', initState)
    console.log({ state })
  },
  clearSession({ dispatch }) {
    // TODO refactor intervalls in an object and iterate them in clearAllIntervals()
    // TODO wrap setInterval and setTimout in setIntervalIfLoggedIn to clear itself if global stat login var is false
    clearInterval(registerIdentityInterval)
    clearTimeout(clientTimeout)

    if (client) client.disconnect()
    dispatch('resetStateKeepAccounts')
    client = undefined // DANGER Uh oh, we're setting global vars
  },
  showSnackbar({ commit }, snackbar) {
    commit('setSnackBar', snackbar)
  },
  // eslint-disable-next-line no-unused-vars
  initWallet({ state, commit, dispatch }) {
    commit('clearClientErrors')

    console.log('Initializing Dash.Client')

    let clientOpts = {
      passFakeAssetLockProofForTests: process.env.LOCALNODE,
      dapiAddresses: process.env.DAPIADDRESSES,
      // wallet: {
      // mnemonic:
      // 'attract glass unlock illegal era utility corn trip truly room amateur ahead', // HiAgain
      // 'pact security road kiwi exhaust camp reason have merge window bitter stumble', // bear
      // },
      apps: {
        dpns: process.env.DPNS,
        primitives: {
          contractId: process.env.PRIMITIVES_CONTRACT_ID,
        },
        jembe: { contractId: process.env.JEMBE_CONTRACT_ID },
        directmessage: {
          contractId: process.env.DIRECTMESSAGE_CONTRACT_ID,
        },
        datastore: {
          contractId: process.env.DATASTORE_CONTRACT_ID,
        },
      },
    }

    // Remove undefined keys
    clientOpts = JSON.parse(JSON.stringify(clientOpts))

    console.log('clientOpts :>> ', { ...clientOpts })

    client = new Dash.Client(clientOpts)

    Object.entries(client.getApps().apps).forEach(([name, entry]) =>
      console.log(name, entry.contractId.toString())
    )

    // client.account = await client.wallet.getAccount({ index: 0 })

    // console.log(
    // 'client.wallet.exportWallet() :>> ',
    // client.wallet.exportWallet()
    // )

    // const identityId = client.account.identities.getIdentityIds()[0]

    // console.log('identityId :>> ', identityId)

    // const [accountDPNS] = await client.platform.names.resolveByRecord(
    // 'dashUniqueIdentityId',
    // identityId
    // )

    // console.log('accountDPNS :>> ', accountDPNS.toJSON())
    // commit('setAccountDPNS', accountDPNS.toJSON())

    // TODO remove code
    // const tmpPrivKey = client.account
    //   .getIdentityHDKeyByIndex(0, 0)
    //   .privateKey.toString()
    // const tmpPubKey = client.account
    //   .getIdentityHDKeyByIndex(0, 0)
    //   .privateKey.publicKey.toBuffer()
    //   .toString('base64')

    // console.log('tmpPrivKey, tmpPubKey :>> ', tmpPrivKey, tmpPubKey)

    // commit('setTmpPrivKey', tmpPrivKey)

    clearInterval(clientTimeout)

    // console.log(
    // 'init Funding address',
    // client.account.getUnusedAddress().address
    // )

    // console.log('init Confirmed Balance', client.account.getConfirmedBalance())

    // console.log(
    //   'init Unconfirmed Balance',
    //   client.account.getUnconfirmedBalance()
    // )

    // commit('setFundingAddress', client.account.getUnusedAddress().address)
  },
  async getMagicInternetMoney() {
    console.log('Awaiting faucet drip..')
    const account = await client.wallet.getAccount()
    const address = account.getUnusedAddress().address
    console.log('... for address: ' + address)
    try {
      // const req = await this.$axios.get(
      //   `https://qetrgbsx30.execute-api.us-west-1.amazonaws.com/stage/?dashAddress=${address}`,
      //   { crossdomain: true }
      // )
      // const req = await this.$axios.get(`http://localhost:5000/evodrip/us-central1/evofaucet/drip/${address}`)
      const reqs = [
        // this.$axios.get(
        //   `https://us-central1-evodrip.cloudfunctions.net/evofaucet/drip/${address}`
        // ),
        // this.$axios.get(`http://134.122.104.155:5050/drip/${address}`),
        // this.$axios.get(`http://155.138.203.42:5050/drip/${address}`),
        this.$axios.get(`http://autofaucet-1.dashevo.io:5050/drip/${address}`),
        this.$axios.get(`http://autofaucet-2.dashevo.io:5050/drip/${address}`),
      ]
      if (process.env.DAPIADDRESSES && process.env.DAPIADDRESSES[0]) {
        const ip = process.env.DAPIADDRESSES[0].split(':')[0]
        reqs.push(this.$axios.get(`http://${ip}:5050/drip/${address}`))
      }

      await Promise.race(reqs)
      console.log('... faucet dropped.')
      console.log(reqs)
    } catch (e) {
      console.log(e)
      throw e
    }
  },
  async registerIdentity({ commit }) {
    console.log('Registering identity...')
    commit('setLoadingStep', 1)
    try {
      const identity = await client.platform.identities.register()
      console.log({ identity })
      console.log(
        'account.getIdentityIds(); :>> ',
        client.account.getIdentityIds()
      )
      // commit('setIdentity', identity.id) // DEPRECATED
      commit('setLoadingStep', 2)
    } catch (e) {
      console.log('identity register error')
      console.log(e)
    }
  },
  registerIdentityOnceBalance({ dispatch }) {
    if (registerIdentityInterval) clearInterval(registerIdentityInterval)

    // eslint-disable-next-line no-unused-vars
    registerIdentityInterval = setInterval(async () => {
      const account = await client.wallet.getAccount()
      console.log('Waiting for positive balance to register identity..')
      console.log('init Funding address', account.getUnusedAddress().address)
      console.log(account.getTotalBalance())
      console.log(account.getConfirmedBalance())
      console.log(account.getUnconfirmedBalance())
      if (account.getConfirmedBalance() > 0) {
        dispatch('registerIdentity')
        clearInterval(registerIdentityInterval)
      }
    }, 5000)
  },
  async dashNameExists({ dispatch }, name) {
    try {
      const doc = await client.platform.names.resolve(name + '.dash')
      console.log(doc)
      return doc ? doc.toJSON() : doc
    } catch (e) {
      dispatch('showSnackbar', { text: e.message })
      console.error('Something went wrong:', e)
    }
  },
  async queryDocuments(
    { dispatch },
    {
      dappName,
      typeLocator,
      queryOpts = {
        limit: 1,
        startAt: 1,
      },
    }
  ) {
    console.log(
      'Querying documents...',
      { dappName, typeLocator, queryOpts },
      client.getApps().get(dappName).contractId.toString()
    )
    try {
      const documents = await client.platform.documents.get(
        `${dappName}.${typeLocator}`,
        queryOpts
      )

      const documentsJSON = documents.map((document) => document.toJSON())

      const userNames = await dispatch(
        'resolveOwnerIds',
        documentsJSON.map((document) => document.$ownerId)
      )

      console.log('userNames :>> ', userNames)

      // for (let idx = 0; idx < documentsJSON.length; idx++) {
      //   documentsJSON[idx]._userName = userNames[idx]
      //     ? userNames[idx].label
      //     : documentsJSON[idx].$ownerId.substr(0, 6) // FIXME use skeleton loader instead of substr, also in getter
      // }

      console.log(
        `Result ${dappName}.${typeLocator}`,
        { queryOpts },
        { documentsJSON }
      )

      return documentsJSON
    } catch (e) {
      console.error('Something went wrong:', e, {
        dappName,
        typeLocator,
        queryOpts,
      })
      dispatch('showSnackbar', { text: e, color: 'red' })
    } finally {
      // commit('setSyncing', false)
    }
  },
  async getContract({ state }) {
    const contract = await client.platform.contracts.get(state.wdsContractId)
    console.log({ contract })
    return contract
  },
}
