const fs = require('fs')
const Dash = require('dash')
const axios = require('axios')

//
// Config
//

// EvoWallet Vars
const mnemonic =
  'treat private pill birth disagree snake spoon fruit edit general clay face'
const userLabel = 'honeybadger' // + Date.now()
const pubKey = 'AleP+EjyyrIDvN4lZTGd43sSb97ZJOD/TBlxDCsTk0st'
const encPvtKey =
  'eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6WzMsNTksMjI2LDIwOCwyMDksMTI0LDQ5LDEzOCwxMTQsNDMsMTU1LDIxMywyMTAsMjIwLDIwNiwyMDYsMTIxLDE5MSwxMjUsNDMsMTI1LDI1NCwyNTMsMTgyLDEzOCw3MSw0Niw4MiwyMDcsMTMwLDIyMCwxODgsMTgxLDI0MSwxMCwyMzEsMjM2LDM2LDI0MiwxNDMsOCwxMCwyMzIsMTMxLDExLDEwMywwLDE3OCwxMDQsNDQsMjQ1LDIyOCw5OCwyMjksMjM5LDExMCw4MiwyOCwyMiwxMTUsMjMxLDEyMywyMTIsMTY0LDExNCwxOTcsMTI3LDIwOCwxMzQsMTU2LDIsMTYyLDE5OSwzLDE2MSw1MiwxMDgsMTMsMTA4LDI0NSwxNDcsMTcsODIsMjI5LDIxLDE1NCwyMjQsMTMwLDIyMiw2MywxMzcsMTA5LDk0LDQ2LDE3NywxNTcsMjIwLDE3MSw5OCw2LDg5LDEwNywxMTcsMTcyLDI0MSwyNiwxNTQsMjAxLDc4LDEwMSwxODEsMjEzLDE3MSwxOTcsMTI0LDExMyw1MywxNzMsODAsNTEsMjE4LDE4NSwxNDYsMjIxLDcsODgsMTAxLDIzMSw5OSw0MywxNzcsODAsMjEyLDE1Nyw3NiwyLDE0Niw2OCwyMzIsMTUsODMsNSwxNzIsMjI1LDEwMywyNiwyNDYsMTUzLDIwOCwxNTUsODEsNiw1MCwyMzgsMjIsMTAyLDYyLDg3LDI0MywxMSwxMDNdfQ=='

// Jembe temp session vars
const sessionMnemonic =
  // 'essay love suffer inquiry buffalo advance glue boil arrive glove clutch oyster'
  // 'bless fluid disagree depart trade donor uniform dust month side dad tray'
  'luggage vacuum solution element rigid have provide enough defense champion frog camera'
// 'catch fine embrace frequent prepare cruise relax faculty artwork yard sustain report'
// 'neither neither apple collect warm trip luggage path tenant test liquid effort'

// mn-bootstrap instance
const dapiAddresses = ['127.0.0.1:3000']
//
// End Config
//

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const clientOpts = {
  passFakeAssetLockProofForTests: process.env.NUXT_LOCALNODE,
  dapiAddresses,
  wallet: {
    // mnemonic: 'treat private pill birth disagree snake spoon fruit edit general clay face'
    // mnemonic: null
    mnemonic,
  },
  apps: {
    dpns: {
      contractId: process.env.NUXT_DPNS_CONTRACT_ID,
    },
    primitives: {
      contractId: process.env.NUXT_PRIMITIVES_CONTRACT_ID_local,
    },
    jembe: {
      contractId: process.env.NUXT_JEMBE_CONTRACT_ID_local,
    },
  },
}

console.dir(clientOpts, { depth: 100 })

const client = new Dash.Client(clientOpts)
let identity, sessionIdentity, userId, sessionClient

const createWallet = async () => {
  client.account = await client.getWalletAccount()
  const mnemonic = client.wallet.exportWallet()
  const address = client.account.getUnusedAddress()
  console.log('Mnemonic:', mnemonic)
  console.log('Unused address:', address.address)
  return address.address
}

const receiveFaucetDrop = async (address) => {
  await axios.get(`http://127.0.0.1:5050/drip/${address}`)

  // await axios.get(`http://134.122.104.155:5050/drip/${address}`)

  let confirmedBalance = client.account.getConfirmedBalance()
  let unconfirmedBalance = client.account.getUnconfirmedBalance()

  console.log('confirmedBalance :>> ', confirmedBalance)
  console.log('unconfirmedBalance :>> ', unconfirmedBalance)

  while (confirmedBalance < 10000) {
    await sleep(1000)

    confirmedBalance = client.account.getConfirmedBalance()
    unconfirmedBalance = client.account.getUnconfirmedBalance()

    console.log('confirmedBalance :>> ', confirmedBalance)
    console.log('unconfirmedBalance :>> ', unconfirmedBalance)
  }
}

const createIdentity = async () => {
  console.log('Registering Identity..')

  identity = await client.platform.identities.register()

  console.log('evowallet identity :>> ', identity.getId().toString())

  return identity
}

const registerName = async (name) => {
  const platform = client.platform

  console.log('Registering name:', name)

  const nameRegistration = await platform.names.register(
    name,
    { dashUniqueIdentityId: identity.getId() },
    identity
  )

  console.log('nameRegistration :>> ', nameRegistration.toJSON())

  userId = nameRegistration.id.toString()

  return nameRegistration
}

const saveNameVars = (nameRegistration) => {
  let envVarString = ''

  envVarString += `export NUXT_JEMBE_NAME_LABEL=${userLabel}\n`
  envVarString += `export NUXT_JEMBE_NAME_USERID=${userId}\n`
  envVarString += `export NUXT_JEMBE_NAME_IDENTITY=${identity
    .getId()
    .toString()}\n`

  envVarString += `export NUXT_JEMBE_MNEMONIC="${sessionMnemonic}"\n`
  envVarString += `export NUXT_JEMBE_IDENTITYID=${sessionIdentity
    .getId()
    .toString()}\n`
  envVarString += `export NUXT_JEMBE_STAY_LOGGED_IN=true\n\n`
  envVarString += `npm run local`

  console.log(envVarString)

  fs.writeFileSync(`./run-logged-in-as-${userLabel}.sh`, envVarString)
  fs.chmodSync(`./run-logged-in-as-${userLabel}.sh`, '755')
  console.log('done saving vars')
  return nameRegistration
}

const submitSignupDocument = async () => {
  console.log('submitsignupdocument')
  const platform = client.platform

  const docProperties = {
    label: userLabel,
    dappIcon: '',
    dappName: 'Jembe',
    contractId: clientOpts.apps.jembe.contractId.toString(),
    accountDocId: userId,
    isRegistered: true,
    normalizedLabel: userLabel,
  }

  console.dir(docProperties)
  // Create the note document
  const signupDocument = await platform.documents.create(
    'primitives.Signup',
    identity,
    docProperties
  )

  const documentBatch = {
    create: [signupDocument],
    replace: [],
    delete: [],
  }

  const result = await platform.documents.broadcast(documentBatch, identity)

  // console.log(result)

  return result
}

const submitSessionDocument = async () => {
  sessionClientOpts = {
    passFakeAssetLockProofForTests: process.env.NUXT_LOCALNODE,
    dapiAddresses,
    wallet: {
      mnemonic: sessionMnemonic,
    },
  }

  sessionClient = new Dash.Client(sessionClientOpts)

  sessionClient.account = await sessionClient.getWalletAccount()

  const address = sessionClient.account.getUnusedAddress()
  console.log('SESSION CLIENT Unused address:', address.address)

  await axios.get(`http://127.0.0.1:5050/drip/${address.address}`)

  // await axios.get(`http://134.122.104.155:5050/drip/${address}`)

  let confirmedBalance = sessionClient.account.getConfirmedBalance()
  let unconfirmedBalance = sessionClient.account.getUnconfirmedBalance()

  console.log('SESSION confirmedBalance :>> ', confirmedBalance)
  console.log('SESSION unconfirmedBalance :>> ', unconfirmedBalance)

  while (confirmedBalance < 10000) {
    await sleep(1000)

    confirmedBalance = sessionClient.account.getConfirmedBalance()
    unconfirmedBalance = sessionClient.account.getUnconfirmedBalance()

    console.log('SESSION confirmedBalance :>> ', confirmedBalance)
    console.log('SESSION unconfirmedBalance :>> ', unconfirmedBalance)
  }

  sessionIdentity = await sessionClient.platform.identities.register()

  console.log('sessionIdentity :>> ', sessionIdentity.getId().toString())

  const platform = client.platform

  const docProperties = {
    pubKey,
    encPvtKey,
    expiresAt: Date.now() + 20 * 1000 * 60,
    contractId: clientOpts.apps.jembe.contractId.toString(),
    sessionIdentityId: sessionIdentity.getId().toString(),
  }

  const sessionDocument = await platform.documents.create(
    'primitives.Session',
    identity,
    docProperties
  )

  const documentBatch = {
    create: [sessionDocument],
    replace: [],
    delete: [],
  }

  const result = await platform.documents.broadcast(documentBatch, identity)

  // console.log('SESSION DOCUMENT BROADCASTED :>> ', result)

  return result
}

// signup
//  "label": "aname",
//  "dappIcon": "",
//  "dappName": "Jembe",
//  "contractId": "BzurZMxGuLNAUs4EZZqqh1eLvWxM37TiKbqYUjxrsGYL",
//  "accountDocId": "9vUqLbfYQYDWQ1f6fpJFH87m1o3ry6W4Na995C8odh28",
//  "isRegistered": true,
//  "normalizedLabel": "aname",

// login
//  "pubKey": "Ar5Sf+iJDnUG4H9kXaXw/NC519U4qzwUHGDlP5YA7ijs",
//  "encPvtKey": "eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6WzIsMTY3LDE4LDI5LDIwOCw5OCw0MCwxNDYsMTM0LDEwMCw0LDEyNiwxMDksMTY3LDY3LDYyLDE1NCwyMzIsMzIsMTcxLDYyLDczLDIxNywxNTksNjMsMTcxLDU5LDE5OSw3NiwyMiwxNjEsMTY3LDI5LDEwNywxNSwxMzcsMTcyLDIyMiw2NSwxMDgsNDQsMTEyLDE2MywxODgsOTAsMjUyLDcyLDE5NSwxLDE1OSwxNzAsMTE2LDE2NCwxMzUsMjE3LDIzLDE5NCwyMzEsMTM0LDE1NiwyMTIsMjMxLDgsNjAsMTY0LDExMyw0NCwyNSw5MCwxOTIsMTA3LDI0MywyMzQsMjMwLDIxOSwxNzEsMTM5LDEyMCwxNjksNzMsMjUyLDE5NSwxMTMsMTQ4LDQwLDIxNCwxMywxNzIsMTQ3LDIwNywxOTksMjEyLDI0OCwyMTksMTQsMTM1LDIyNSwxNjIsMTUxLDI0OCw3MCwwLDIyNCwxNzksMTM4LDE2NSwyNDAsMTQ4LDExOCwxMjcsMTMyLDE4Miw5OCwxNDksMTE1LDc3LDIyNCwyMDYsMjI3LDIyMywxNzIsMTk0LDczLDkyLDE3Myw4MSwzNywyNyw1NiwyMjAsNzksNzMsMjEsOTgsMjI1LDg1LDIwMiwxODcsMTk0LDExMywyNTIsMjI4LDQ4LDI0MSwxNzAsMjksMjIzLDE2MSwxNiwxNDIsOCw3MiwxNTksNjgsMTQ4LDE2MSw5NywxNjMsMTIzLDE4OSwyMjNdfQ==",
//  "expiresAt": 1609574226045,
//  "contractId": "CRetaRSpnfvM4rBzrXxRXGLvTRuAmi8K4tMm7YdVDaZh",
//     "sessionIdentityId": "FfbB119uURqqGazfTqXVETasUBKEkjBTZp7Urn7nKvoy",

createWallet()
  .then((address) => receiveFaucetDrop(address))
  .then(() => createIdentity())
  .then(() => registerName(`${userLabel}.dash`))
  .then(() => submitSignupDocument())
  .then(() => submitSessionDocument())
  .then(() => saveNameVars())
  .catch((e) => {
    console.error('Something went wrong:\n', e)
    console.dir(e.metadata)
  })
  .finally(() => {
    client.disconnect()
    sessionClient.disconnect()
  })
