# jembe

> everyone gather together in peace

## Development Setup

Jembe relies on https://github.com/dashameter/dashpay-ext-poc for login and state transition signing.

### DashPay Ext Quickstart

`git clone https://github.com/dashameter/dashpay-ext-poc.git`
`npm ci`

DashPay Ext POC expects the following env vars:

```
export VUE_APP_DAPIADDRESSES='["127.0.0.1:3000"]'
export VUE_APP_DPNS_CONTRACT_ID=3U9UGHS38TwnRGKKiKTmX4RKPz1Vyq4sqqW6v7WLLnFA
```

(replace the vars with your setup's values)

`npm run serve`

Go to `chrome://extensions` and enable Developer mode in the top right.

Select "Load unpacked" and navigate to your `dashpay-ext-poc/dist` folder and load it. This should add the DashPay extension to chrome, pin it to always see the icon.

### Jembe Quickstart

`git clone https://github.com/dashameter/jembe.git` (ideally you clone your fork so you can work on it)
`npm ci`

Jembe expects the following env variables:

```
export NUXT_JEMBE_CONTRACT_ID_local=gDCrXwWwXQJ9NaZkNBJuhcueD7AworqnJGV4t1h8PmH
export NUXT_MNEMONIC="rival estate inside turn journey charge window rhythm marble audit amateur bus"
export NUXT_DPNS_CONTRACT_ID=DQHBiBTqNU5ccLA9HmjqfZDKxdVj1pVUYWngQtXfx4cZ
export NUXT_DAPIADDRESSES='["127.0.0.1:3000"]'
```

(replace the vars with your setup's values)

`npm run local`

Jembe ships with helper scripts that will automatically store the vars in `~/.evoenv` and source them before executing a script.

`npm run reset:dashmate` resets the entire dashmate docker orchestration, funds 2 mnemonics, registers two testusers on dpns, adds the dpns and jembe contract ids to the env vars

`npm run reset:contract` registers a new jembe contract and adds the contract id to the env vars

`npm run register:testuser` registers 2 testusers to facilitate development with dashpay-ext-poc

For detailed explanation on how things work, check out [Nuxt.js docs](https://nuxtjs.org).
