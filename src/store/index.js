import { queryInfo } from '../assets/queryDB.js'

import { createStore } from 'vuex'

export default createStore({
  actions: {
    async wsConnect(context, info) {
      const URL = `ws://${localStorage.getItem('adress')}/ws?userID=${info["uuid"]}&groupID=${info["groupID"]}&token=${localStorage.getItem('token')}`
      const ws = new WebSocket(URL)

      context.commit('newConnection', {
        "groupID": info["groupID"], 
        "ws": ws,
      })
      ws.onmessage = async function (event) {
        const data = JSON.parse(event["data"])
        const fullData = await queryInfo("Account", data["senderKey"], data["senderID"])
        context.commit('getNewMessage', {
          "groupID": data["group"],
          "payload": {...fullData, ...data}
        })
      }
    },

    loginAs(context, info) {
      context.commit('loginAs', info)
    },

    lastMessage(context, info) {
      context.commit('lastMessage', info)
    }
  },

  mutations: {
    newConnection(state, connect) {
      state.wsConnections[connect["groupID"]] = connect["ws"]
      state[connect["groupID"]] = ""
    },
    getNewMessage(state, payload) {
      state[payload["groupID"]] = payload["payload"]
    },
    loginAs(state, info) {
      state["account"] = info["account"]
      state["userName"] = info["userName"]
    },
    lastMessage(state, info) {
      state[`lastMessageOf${info["group"]}`] = info["payload"]
    }
  },

  state: {
    account: "",
    userName: "",
    wsConnections: {},
  },
})