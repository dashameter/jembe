const fs = require('fs')
const Dash = require('dash')
const axios = require('axios')

//
// Config
//

// DashPay Wallet Vars
const users = [
  {
    mnemonic:
      'sphere ozone bachelor raise clutch mercy mansion cook teach eager sleep gadget',
    label: 'HoneyBadger', // + Date.now(),
  },
  {
    mnemonic:
      'proud group frequent erase retire approve produce race wealth picnic alert pear',
    label: 'Bob', // + Date.now(),
  },
]

// dashmate instance
const dapiAddresses = ['127.0.0.1:3000']

//
// End Config
//

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const initWalletAccount = async (client) => {
  const account = await client.getWalletAccount()
  const mnemonic = client.wallet.exportWallet()
  const address = account.getUnusedAddress()
  console.log('Mnemonic:', mnemonic)
  console.log('Unused address:', address.address)
  return account
}

const createIdentity = async (client) => {
  console.log('Registering Identity..')

  const identity = await client.platform.identities.register()

  console.log('identity :>> ', identity)
  console.log('identityID :>> ', identity.getId().toString())

  return identity
}

const registerName = async ({ client, identity, name }) => {
  const platform = client.platform
  console.log('Registering name:', name)

  console.log('identity :>> ', identity)

  console.log('identity.getId() :>> ', identity.getId())

  const nameRegistration = await platform.names.register(
    name,
    { dashUniqueIdentityId: identity.getId() },
    identity
  )

  console.log('nameRegistration :>> ', nameRegistration.toJSON())

  return nameRegistration
}

// const saveNameVars = ({ identity, nameRegistration }) => {
//   let envVarString = ''

//   envVarString += `export NUXT_JEMBE_NAME_LABEL=${nameRegistration.label}\n`
//   envVarString += `export NUXT_JEMBE_NAME_USERID=${identity
//     .getId()
//     .toString()}\n`
//   envVarString += `export NUXT_JEMBE_NAME_IDENTITY=${identity
//     .getId()
//     .toString()}\n`

//   envVarString += `export NUXT_JEMBE_STAY_LOGGED_IN=true\n\n`
//   envVarString += `npm run local`

//   console.log(envVarString)

//   fs.writeFileSync(
//     `./run-logged-in-as-${nameRegistration.label}.sh`,
//     envVarString
//   )
//   fs.chmodSync(`./run-logged-in-as-${nameRegistration.label}.sh`, '755')
//   console.log('done saving vars')
//   return nameRegistration
// }

users.forEach(async (user) => {
  const clientOpts = {
    dapiAddresses,
    wallet: {
      mnemonic: user.mnemonic,
    },
    apps: {
      dpns: {
        contractId: process.env.NUXT_DPNS_CONTRACT_ID,
      },
    },
  }

  console.dir(clientOpts, { depth: 100 })

  const client = new Dash.Client(clientOpts)

  try {
    client.account = await initWalletAccount(client)

    const identity = await createIdentity(client)

    const nameRegistration = await registerName({
      client,
      identity,
      name: `${user.label}.dash`,
    })

    console.log('nameRegistration :>> ', nameRegistration)

    // await saveNameVars({ identity, nameRegistration })
  } catch (e) {
    console.error('Something went wrong:\n', e)
    console.dir(e, { depth: 100 })
    console.dir(e.metadata, { depth: 100 })
  } finally {
    client.disconnect()
  }
})
