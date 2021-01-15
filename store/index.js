import Dash from 'dash'
import Vue from 'vue'
// eslint-disable-next-line no-unused-vars
import { decrypt, encrypt } from 'dashmachine-crypto'
import dsm from 'dash-secure-message'
import { crypto } from '@dashevo/dashcore-lib'

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

// mnemonic: "come sight trade detect travel hazard suit rescue special clip choose crouch"
const getInitState = () => {
  console.log('getinitstate')
  return {
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
      identityId: process.env.NAME_IDENTITY_ID,
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
      dm: [],
      // lastTimeCheckedReceived: 0,
      // lastTimeCheckedSent: 0,
      lastSeen: {},
    },
    contactList: {},
    notifications: [],
    jamsById: {},
    lastSeen: {},
  }
}
export const state = () => getInitState()

export const getters = {
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
    const chatPartnerMessages = state.directMessage.dm.filter((message) => {
      return message.senderUserName === chatPartnerUserName
    })
    const lastDoc = chatPartnerMessages[chatPartnerMessages.length - 1]
    return lastDoc ? lastDoc.encMessage : ''
  },
  getLastPartnerMessageTime: (state, getters) => (chatPartnerUserName) => {
    const chatPartnerMessages = state.directMessage.dm.filter((message) => {
      return message.senderUserName === chatPartnerUserName
    })
    const lastDoc = chatPartnerMessages[chatPartnerMessages.length - 1]
    console.log('lastDoc :>> ', lastDoc)
    return lastDoc ? lastDoc.$createdAt : 0
  },
  getChatPartnerNewMessageCount: (state, getters) => (chatPartnerUserName) => {
    const lastSeenTimestamp =
      state.directMessage.lastSeen[chatPartnerUserName] || 0
    console.log(
      'getChatPartnerNewMessageCount lastSeen timestamp:>> ',
      chatPartnerUserName,
      lastSeenTimestamp
    )
    const chatPartnerMessages = state.directMessage.dm.filter((message) => {
      console.log(
        'getChatPartnerNewMessageCount chatPartnerMessages :>> ',
        message.$createdAt - lastSeenTimestamp
      )

      return (
        message.senderUserName === chatPartnerUserName &&
        message.$createdAt > lastSeenTimestamp
      )
    })
    console.log(
      'getChatPartnerNewMessageCount chatPartnerMessages :>> ',
      chatPartnerMessages,
      chatPartnerMessages.length
    )

    return chatPartnerMessages.length
  },
  badgeCount: (state) => (eventType) =>
    state.notifications.filter((n) => n.$createdAt > state.lastSeen[eventType])
      .length,
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
    console.log('contactlist', Object.entries(state.contactList))
    return Object.entries(state.contactList)
  },
  getDirectMessages: (state) => (chatPartnerUserName) => {
    const directMessages = state.directMessage.dm.filter((message) => {
      return (
        message.senderUserId === chatPartnerUserName ||
        message.receiverUserId === chatPartnerUserName
      )
    })

    return directMessages
  },
  getUserFollowing: (state) => (userName) => {
    const following = state.follows.following[userName.toLowerCase()]
    return following ? following.docs : []
  },
  getUserFollowers: (state) => (userName) => {
    const followers = state.follows.followers[userName.toLowerCase()]
    return followers ? followers.docs : []
  },
  getiFollow: (state) => (jammerId) => {
    const following = state.follows.following[state.name.label.toLowerCase()]

    return following ? following.docs.includes(jammerId) : false
  },
  getUserFollowersCount: (state) => (userName) => {
    const follows = state.follows.followers[userName.toLowerCase()]
    console.log('follows :>> ', follows)

    return follows ? follows.docs.length : '?'
  },
  getUserFollowingCount: (state) => (userName) => {
    const follows = state.follows.following[userName.toLowerCase()]

    return follows ? follows.docs.length : '?'
  },
  getUserSignupTime: (state) => (userName) => {
    const signup = state.userSignups[userName.toLowerCase()]

    return signup ? signup.humanTime : '?'
  },
  getProfile: (state) => (userName) => {
    const storedProfile = state.users[userName.toLowerCase()] || {}

    const profile = {}
    profile.avatar = storedProfile.avatar || require('~/assets/avataaar.png')
    profile.theme = storedProfile.theme || require('~/assets/theme.png')
    profile.statusMessage = storedProfile.statusMessage || ''

    profile.avatarRaw = storedProfile.avatarRaw || ''
    profile.themeRaw = storedProfile.themeRaw || ''

    return profile
  },
  getLoadingStep(state) {
    return state.loadingSteps[state.loadingStep]
  },
  hasSession(state) {
    return Object.keys(state.session).length > 0
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
  setLastSeenDirectMessage(state, { chatPartnerUserName, timestamp }) {
    Vue.set(state.directMessage.lastSeen, chatPartnerUserName, timestamp)
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
    Vue.set(state.directMessage, 'dm', directMessage.dm)
  },
  updateDirectMessageSending(state, { tmp$id, directMessage }) {
    const idx = state.directMessage.dm.findIndex(
      (message) => message.$id === tmp$id
    )
    if (idx > -1) Vue.set(state.directMessage.dm, idx, directMessage)
  },
  appendDirectMessageSending(state, directMessage) {
    state.directMessage.dm.push(directMessage)
  },
  setPresentedOnboarding(state, bool) {
    state.presentedOnboarding = bool
  },
  setDPNSUser(state, dpnsUser) {
    Vue.set(state.dpns, dpnsUser.normalizedLabel, dpnsUser)
  },
  setFollows(state, { follows, followType, userName, userId }) {
    Vue.set(state.follows[followType], userName.toLowerCase(), follows)
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
    const userNormalizedLabel = state.name.label.toLowerCase()

    const initFollow = {
      docs: [],
      refreshedAt: 0,
    }

    // Init follow if it has not finished fetching
    if (!state.follows.following[userNormalizedLabel]) {
      Vue.set(state.follows.following, userNormalizedLabel, initFollow)
    }

    // Just using a shorter var for brevity
    const docs = state.follows.following[userNormalizedLabel].docs

    if (isFollowing) {
      // Add userId of person I follow to state
      docs.push(jammerId)
    } else {
      // Remove the userId of the person I unfollow from state
      state.follows.following[userNormalizedLabel].docs = docs.filter(
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
  async validateDocumentSessionIdentity({ dispatch }, documents) {
    // const documentPromises =

    const validDocuments = []
    for (let idx = 0; idx < documents.length; idx++) {
      const doc = documents[idx]
      const dpnsUser = await dispatch('resolveUsername', doc.data.userName)

      // Find a valid session
      const validSessionResult = await dispatch(
        'fetchValidSessionIdentity',
        doc.toJSON()
      )

      console.log('validator validSessionResult :>> ', validSessionResult)

      console.log('validator', doc, { dpnsUser })

      if (
        validSessionResult && // jams.$ownerId === Session.sessionIdentityId with valid timestamp
        dpnsUser && // label exists on dpns
        dpnsUser.$id === doc.data.userId && // jams.userId === dpns.userId for given label
        dpnsUser.records.dashUniqueIdentityId === validSessionResult.$ownerId // The main identity that authorized the session owns the username
      ) {
        doc.data.userName = dpnsUser.label // Overwrite userName to ensure correct capitalization
        validDocuments.push(doc)
      }
    }
    return validDocuments
    // return documents
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
  async bookmarkJam(
    { dispatch, state },
    { jamId, isBookmarked = true, opUserId, opUserName, userName }
  ) {
    const bookmark = {
      jamId,
      isBookmarked,
      userId: state.name.userId,
      userName,
      opUserId,
      opUserName,
    }
    await dispatch('submitDocument', { type: 'bookmarks', doc: bookmark })
  },
  async fetchBookmarks({ commit, dispatch, state }) {
    const queryOpts = {
      limit: 100,
      startAt: 1,
      orderBy: [['$createdAt', 'desc']],
      where: [['userId', '==', state.name.userId]],
    }

    let bookmarksByUserId = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'bookmarks',
      queryOpts,
    })

    bookmarksByUserId = bookmarksByUserId.map((x) => x.toJSON())

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
  async fetchLikesByUser({ commit, dispatch, state }, { userId, userName }) {
    const queryOpts = {
      limit: 20,
      startAt: 1,
      orderBy: [['$createdAt', 'desc']],
      where: [['userId', '==', userId]],
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
    commit('setLikedJamsByUsername', { jams: likedJamsByUser, userName })
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
      { docType: 'jams', where: [['opUserId', '==', state.name.userId]] },
      {
        docType: 'likes',
        where: [
          ['opUserId', '==', state.name.userId],
          ['isLiked', '==', true],
        ],
      },
      {
        docType: 'mentions',
        where: [
          ['mentionedUserId', '==', state.name.userId],
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
      limit: 10,
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
      limit: 10,
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
    directMessage.dm = [...state.directMessage.dm]

    const lastTimeChecked = function (direction) {
      const dms = directMessage.dm.filter(
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
      typeLocator: 'dm',
      queryOpts: queryOptsReceived,
    })

    receivedResult.then((receivedResult) => {
      console.log('receivedResult :>> ', receivedResult)

      if (receivedResult[0])
        directMessage.lastTimeCheckedReceived = receivedResult[0].toJSON().$createdAt

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

        directMessage.dm.push(decryptedMessage)
      })
    })

    const sentResult = dispatch('queryDocuments', {
      dappName: 'directmessage',
      typeLocator: 'dm',
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
        directMessage.dm.push(decryptedMessage)
      })
    })

    await Promise.all([sentResult, receivedResult])

    console.log('directMessage :>> ', directMessage)

    const sendingDms = [...state.directMessage.dm].filter(
      (message) => message.isSending
    )

    directMessage.dm = directMessage.dm.concat(sendingDms)

    directMessage.dm.sort((a, b) => (a.$createdAt > b.$createdAt ? 1 : -1))

    // Deduplicate messages by $id
    directMessage.dm = directMessage.dm.filter(
      (message, idx, dm) =>
        dm.findIndex((msg) => msg.$id === message.$id) === idx
    )

    commit('setDirectMessage', directMessage)
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
    // Prepare `type: dm` DirectMessage document
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
        `directmessage.dm`,
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
    let dpnsUser
    if (userNormalizedLabel in state.dpns) {
      dpnsUser = state.dpns[userNormalizedLabel]
      console.log('Found existing cached dpns user', dpnsUser)
    } else {
      dpnsUser = await client.platform.names.resolve(
        `${userNormalizedLabel}.dash`
      )
      console.log('Fetched unknown userName', userName, dpnsUser)
      if (!dpnsUser) return null
      dpnsUser = dpnsUser.toJSON()
      commit('setDPNSUser', dpnsUser)
    }
    console.log('dpnsUser :>> ', dpnsUser)
    return dpnsUser
  },
  // query follows docType to get all the jammerId's this person is following

  async resolveUserId({ dispatch }, userId) {
    const queryOpts = {
      limit: 1,
      startAt: 1,
      where: [['$id', '==', userId]],
    }

    const [dpnsDoc] = await dispatch('queryDocuments', {
      dappName: 'dpns',
      typeLocator: 'domain',
      queryOpts,
    })

    return dpnsDoc ? dpnsDoc.toJSON() : null
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
      uniqueUserNames[jam.userName.toLowerCase()] = true
    }

    for (const userName in uniqueUserNames) {
      dispatch('fetchUserInfo', { userName })
    }
  },
  async fetchUserInfo({ dispatch, state }, { userName, forceRefresh = false }) {
    const userNormalizedLabel = userName.toLowerCase()

    // Don't refresh cached users unless forceRefresh is requested (avoid hitting DAPI with every tweet list view)
    if (state.userSignups[userNormalizedLabel] && forceRefresh === false) {
      return
    }

    // const userId = getUserIdFromUserName(userName)
    // TODO cache dpns userIds
    const userId = (await dispatch('resolveUsername', userName)).$id

    // console.log('fetchUserInfo result :>> ', result)

    // const userId = result.$id

    dispatch('fetchFollows', {
      followType: 'following',
      userId,
      userName: userNormalizedLabel,
    })

    dispatch('fetchFollows', {
      followType: 'followers',
      userId,
      userName: userNormalizedLabel,
    })

    dispatch('fetchUserSignup', {
      userId,
      userName: userNormalizedLabel,
    })

    dispatch('fetchProfile', userNormalizedLabel)
  },
  async fetchProfile({ dispatch, commit, getters }, userName) {
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
  async sendJam(
    { dispatch, state },
    { jamText, replyToJamId = '', reJamId = '', opUserId = '', opUserName = '' }
  ) {
    const identity = await client.platform.identities.get(
      client.account.getIdentityIds()[0]
    )

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

    const mentionedUserIds = mentionedUsers.map((m) => (m ? m.$id : null))

    const mentionedUserIdsExist = mentionedUserIds.filter((m) => m != null)

    console.log('mentionedUserIds :>> ', mentionedUserIds)

    console.log('mentionedUserIdsExist :>> ', mentionedUserIdsExist)

    const jamDocProperties = {
      text: jamText,
      userName: state.name.label,
      userId: state.name.userId,
      replyToJamId,
      reJamId,
      opUserId,
      opUserName,
      mentionedUserIds: mentionedUserIdsExist,
      tags,
    }

    console.log('jamDocProperties :>> ', jamDocProperties)

    const jamDoc = await client.platform.documents.create(
      'jembe.jams',
      identity,
      jamDocProperties
    )

    // Convert tags array to individual documents for the jeme.tags doctype,
    // this serves as an index for querying jams filtered by tags

    const tagsDocProperties = []

    tags.forEach((value, index, array) => {
      console.log('tag value :>> ', value)
      if (value == null) return

      const tagDocProperties = {
        tag: value,
        opUserId: state.name.userId,
        jamId: jamDoc.id.toString(),
        index,
      }

      console.log('tagsDocProperties :>> ', tagsDocProperties)

      const tDocPromise = client.platform.documents.create(
        'jembe.tags',
        identity,
        tagDocProperties
      )

      tagsDocProperties.push(tDocPromise)
    })

    const tagsDocs = await Promise.all(tagsDocProperties)

    // Convert mentionedUserIds array to individual documents for the jeme.mentions doctype,
    // this serves as an index for querying jams filtered by mentions

    const mentionsDocProperties = []

    mentionedUserIds.forEach((value, index, array) => {
      console.log('value :>> ', value)
      if (value == null) return

      const mDocProperties = {
        mentionedUserId: jamDoc.data.mentionedUserIds[index],
        mentionedUserName: mentions[index].value.substring(1),
        opUserId: state.name.userId,
        opUserName: state.name.label,
        jamId: jamDoc.id.toString(),
        index,
      }

      console.log('mDocProperties :>> ', mDocProperties)

      const mDocPromise = client.platform.documents.create(
        'jembe.mentions',
        identity,
        mDocProperties
      )

      mentionsDocProperties.push(mDocPromise)
    })

    const mentionsDocs = await Promise.all(mentionsDocProperties)

    console.log('mentionsDocs :>> ', mentionsDocs)

    // Submit Jam and additional mentions and tags docs (as indices) in a batch transition
    const documents = [].concat(jamDoc, ...mentionsDocs, ...tagsDocs)

    const documentBatch = {
      create: documents,
      replace: [],
      delete: [],
    }

    const result = await client.platform.documents.broadcast(
      documentBatch,
      identity
    )
    console.log('result :>> ', result)
    // const docs = []

    // docs.push(jamDoc)

    // await dispatch('submitDocument', { type: 'jams', docs })
  },
  async sendJamAndRefreshJams(
    { dispatch },
    {
      jamText,
      replyToJamId = '',
      reJamId = '',
      opUserId = '',
      opUserName = '',
      view = '/discover',
    }
  ) {
    await dispatch('sendJam', {
      jamText,
      replyToJamId,
      reJamId,
      opUserId,
      opUserName,
      view,
    })

    // TODO remove orderBy ASC case when switching to fetching deltas, order the view instead
    let orderBy = [['$createdAt', 'desc']]
    // In case of a thread conversation, sort oldest first

    if (view.includes('/status/')) {
      orderBy = [['$createdAt', 'asc']]
      await dispatch('fetchReplyThread', {
        view,
        jamId: replyToJamId,
      })
    } else {
      await dispatch('fetchJams', { view, orderBy })
    }
  },
  async likeJam(
    { dispatch, state },
    { jamId, isLiked = true, opUserId, opUserName, userName }
  ) {
    const like = {
      jamId,
      isLiked,
      userId: state.name.userId,
      userName,
      opUserId,
      opUserName,
    }
    console.log('like :>> ', like)
    console.log(JSON.stringify(like))
    await dispatch('submitDocument', { type: 'likes', doc: like })
  },
  async followJammer(
    { dispatch, state, commit },
    { jammerId, userName, isFollowing = true } // FIXME jammerId should go with jammerName, not userName
  ) {
    const follow = {
      jammerId,
      isFollowing,
      userId: state.name.userId,
    }
    commit('setiFollow', { jammerId, isFollowing })
    await dispatch('submitDocument', { type: 'follows', doc: follow })
    await dispatch('fetchFollows', {
      followType: 'followers',
      userName,
      userId: jammerId,
    })
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

    const rootJam = rootResult.toJSON()
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

      const contextJam = contextResult.toJSON()
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

    const comments = result.map((jam) => jam.toJSON())

    jams.push(...comments)
    console.log('jams comments :>> ', jams)

    await commit('setJams', { view, jams })
    dispatch('refreshLikesInState', { view })
    dispatch('refreshRejamCountInState', { view })
    dispatch('refreshCommentCountInState', { view })
    dispatch('fetchUserInfoForJams', jams)
  },
  // TODO remove, deprecated
  // removeOtherJams({ state, commit }, jamId) {
  //   const jams = state.jams.filter((jam) => jam.$id === jamId)
  //   commit('setJams', jams)
  // },
  async fetchJamIdsByTag({ dispatch }, { tag }) {
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
    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'tags',
      queryOpts,
    })
    console.log('result :>> ', result)
    return result.map((x) => x.data.jamId)
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
    const jam = result.map((jam) => jam.toJSON())
    console.log('jam 0', jam[0])
    commit('setJamById', jam[0])
    return { ...jam[0] }
  },
  // TODO only fetch Jams newer than most recent jam
  async fetchJams( // fetchJamsByView
    { dispatch, commit },
    { view, orderBy = undefined, where = undefined }
  ) {
    console.log('fetchJams()')
    console.log('orderBy :>> ', orderBy)
    const queryOpts = {
      startAt: 1,
      limit: 100,
      orderBy,
      where,
    }
    console.log('queryOpts :>> ', queryOpts)

    const result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'jams',
      queryOpts,
    })

    // Convert to JSON format to avoid trouble with the vuex-persisted-state localstorage plugin
    const jams = result.map((jam) => jam.toJSON())

    // Resolve jams that have reJam content concurrently
    const promisedJams = jams.map(async (jam) => {
      if (jam.reJamId !== '') {
        const reJam = await dispatch('fetchJamById', jam.reJamId)
        reJam.reJamByUsername = jam.userName
        reJam.$id = jam.$id
        return reJam
      } else {
        return jam
      }
    })

    const resolvedJams = await Promise.all(promisedJams)

    commit('setJams', { view, jams: resolvedJams })

    dispatch('refreshLikesInState', { view })
    dispatch('refreshCommentCountInState', { view })
    dispatch('refreshRejamCountInState', { view })
    dispatch('fetchUserInfoForJams', resolvedJams)
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
      if (!state.jams[view][idx].reJamByUsername) {
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
      if (!state.jams[view][idx].reJamByUsername) {
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
    const mostRecentComment = result[result.length - 1].toJSON()
    commentsCount.refreshedAt = mostRecentComment.$createdAt

    // Add newly found comments to tally
    commentsCount.comments += result.length

    await commit('setComments', commentsCount)

    // Recursively call `countComments()` if there are more docs than the queryLimit allowed to fetch
    if (result.length === queryOpts.limit) {
      dispatch('countComments', { jamId })
    }
  },
  async fetchFollows(
    { dispatch, commit, state },
    { followType, userId, userName }
  ) {
    // Load follows object from state if exists or init new object
    const storedFollows = state.follows[followType][userName.toLowerCase()]
    console.log('storedFollows :>> ', storedFollows)
    const follows = storedFollows
      ? { ...storedFollows }
      : { docs: [], refreshedAt: 0 }
    console.log('follows :>> ', follows)

    // Set query field depending on follow direction
    let queryUserParam
    let storeUserParam

    if (followType === 'following') {
      queryUserParam = 'userId'
      storeUserParam = 'jammerId'
    } else if (followType === 'followers') {
      queryUserParam = 'jammerId'
      storeUserParam = 'userId'
    }

    const queryOpts = {
      startAt: 1,
      limit: 100,
      orderBy: [['$createdAt', 'asc']],
      where: [
        // queryUserParam: userId || jammerId == userId
        [queryUserParam, '==', userId],
        ['$createdAt', '>', follows.refreshedAt],
      ],
    }

    let result = await dispatch('queryDocuments', {
      dappName: 'jembe',
      typeLocator: 'follows',
      queryOpts,
    })

    // No follows docs, set state to resolve loading indicator and return early
    if (result.length === 0) {
      commit('setFollows', { follows, followType, userName, userId })
      return
    }

    result = result.map((follow) => follow.toJSON())

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
    follows.refreshedAt = mostRecent.$createdAt

    commit('setFollows', { follows, followType, userName, userId })

    // Recursively call `fetchFollows()` if there are more docs than the queryLimit allowed to fetch
    // TODO test if dispatching after committing maintains reactivity
    if (result.length === queryOpts.limit) {
      dispatch('fetchFollows', { followType, userName, userId })
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
      orderBy: [['$createdAt', 'asc']],
      where: [
        ['jamId', '==', jamId],
        ['$createdAt', '>', likesCount.refreshedAt],
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
  async submitDocument(
    // eslint-disable-next-line no-unused-vars
    { commit, dispatch, state },
    { contract = 'jembe', type, doc }
  ) {
    console.log('submittingocument')
    console.log({ doc })
    console.log('of type')
    console.log({ type })

    const { platform } = client

    try {
      const identityId = client.account.getIdentityIds()[0]
      // const { identityId } = state
      console.log({ identityId })
      const identity = await platform.identities.get(identityId)
      // const identity = await cachedOrGetIdentity(client, identityId)

      // console.log({ identity })

      // Create the note document
      const document = await platform.documents.create(
        `${contract}.${type}`,
        identity,
        doc
      )
      console.log('created document :>> ', document)
      const documentBatch = {
        // TODO phaseb add delegatedSignatures document and broadcast as batch
        create: [document],
        replace: [],
        delete: [],
      }
      // console.log('created document:', { document })
      // Sign and submit the document
      const result = await platform.documents.broadcast(documentBatch, identity)
      console.log('document submitted result :>> ', result.toJSON())
      // commit('addDocument', { identity, document }) // FIXME next under contractId
      commit('setIsSyncing', false)
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
  async syncSession({ dispatch, state, commit }) {
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
    }
    commit('setSession', { session })
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

  async initOrCreateAccount({ commit, dispatch, state }, { mnemonicPin }) {
    // Get client to isReady state (with existing mnemonic or creating a new one)
    // Check if we have a balance, if not, get a drip
    // If Getting a drip, wait via setInterval for balance
    // +if error or timeout, instruct for manual balance increase // TODO implement wait for balance timeout
    // Once we have a balance:
    // (check if we have an identity, if not)
    // create identity, commit identity
    // create name, set isRegistered = true // TODO implement recover identity and name from dpp
    // catch errors at each step and self heal // TODO tests
    try {
      console.log('initorcreate, dispatch init')
      await dispatch('initWallet', { mnemonicPin })
    } catch (e) {
      console.dir({ e }, { depth: 5 })
      let message = e.message

      // FIXME decryptMnemonic clearly needs better error handling
      if (message === 'Expect mnemonic to be provided') {
        message = 'You entered the wrong PIN / Password.'
      }
      commit('setClientErrors', 'Connecting to Evonet: ' + message)
    }
    console.log("I'm done awaiting client.isReady()....")

    const confirmedBalance = client.account.getConfirmedBalance()
    console.log('Confirmed Balance: ' + confirmedBalance)
    if (confirmedBalance > 500000) {
      if (!client.account.getIdentityIds()[0]) {
        this.registerIdentity()
      } else {
        console.log(
          'Found existing identityId',
          client.account.getIdentityIds[0]
        )
      }
    } else {
      try {
        await dispatch('getMagicInternetMoney')
        // console.log('not getting a drip, faucet is broken')
      } catch (e) {
        console.log('commit error?', e)
        commit(
          'setClientErrors',
          e.message +
            ' | Faucet not responding, manually send some evoDash to ' +
            client.account.getUnusedAddress().address
        )
      }

      // TODO need to check if identity belongs to mnemonic
      if (!client.account.getIdentityIds()[0]) {
        dispatch('registerIdentityOnceBalance')
      } else {
        console.log(
          'Found existing identityId',
          client.account.getIdentityIds()[0]
        )
      }
    }
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
  async initWallet({ state, commit, dispatch }) {
    commit('clearClientErrors')

    console.log('Initializing Dash.Client with mnemonic: ')
    console.log('Mnemonic:', state.mnemonic)

    let clientOpts = {
      passFakeAssetLockProofForTests: process.env.LOCALNODE,
      dapiAddresses: process.env.DAPIADDRESSES,
      wallet: { mnemonic: state.mnemonic },
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

    console.log('clientOpts after init :>> ', clientOpts)

    Object.entries(client.getApps().apps).forEach(([name, entry]) =>
      console.log(name, entry.contractId.toString())
    )

    // Timeout isReady() since we can't catch timeout errors
    clientTimeout = setTimeout(() => {
      commit('setClientErrors', 'Connection to Evonet timed out.')
    }, 500000) // TODO set sane timeout

    client.account = await client.wallet.getAccount({ index: 0 })

    commit('setMnemonic', client.wallet.exportWallet())
    console.log('client :>> ', client)
    console.log('client.wallet :>> ', client.wallet)
    console.log('client.account :>> ', client.account)
    console.log('client.wallet.mnemonic :>> ', client.wallet.mnemonic)
    console.log(
      'client.account.getIdentityIds()[0] :>> ',
      client.account.getIdentityIds()[0]
    )
    const tmpPrivKey = client.account
      .getIdentityHDKeyByIndex(0, 0)
      .privateKey.toString()
    const tmpPubKey = client.account
      .getIdentityHDKeyByIndex(0, 0)
      .privateKey.publicKey.toBuffer()
      .toString('base64')

    console.log('tmpPrivKey, tmpPubKey :>> ', tmpPrivKey, tmpPubKey)
    console.log(
      'account.getIdentityIds(); :>> ',
      client.account.getIdentityIds()
    )

    commit('setTmpPrivKey', tmpPrivKey)

    clearInterval(clientTimeout)

    console.log({ client })

    console.log(
      'init Funding address',
      client.account.getUnusedAddress().address
    )
    console.log('init Confirmed Balance', client.account.getConfirmedBalance())
    console.log(
      'init Unconfirmed Balance',
      client.account.getUnconfirmedBalance()
    )
    commit('setFundingAddress', client.account.getUnusedAddress().address)
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
        this.$axios.get(`http://134.122.104.155:5050/drip/${address}`),
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
    // eslint-disable-next-line no-unused-vars
    { dispatch, commit },
    {
      dappName,
      typeLocator,
      queryOpts = {
        limit: 1,
        startAt: 1,
      },
    }
  ) {
    // if (typeLocator !== 'Session') {
    console.log(
      'Querying documents...',
      { dappName, typeLocator, queryOpts },
      client.getApps().get(dappName).contractId.toString()
    )

    // }
    // commit('setSyncing', true)
    try {
      let documents = await client.platform.documents.get(
        `${dappName}.${typeLocator}`,
        queryOpts
      )
      console.log(
        `Result ${dappName}.${typeLocator}`,
        { queryOpts },
        { documents }
      )
      if (`${dappName}.${typeLocator}` === 'jembe.jams') {
        // Ignore validation for local development
        if (!process.env.STAY_LOGGED_IN) {
          documents = await dispatch(
            'validateDocumentSessionIdentity',
            documents
          )
        }
      }
      return documents
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
