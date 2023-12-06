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
      ws.onmessage = function (event) {
        const data = JSON.parse(event["data"])
        context.commit('getNewMessage', {
          "groupID": data["group"],
          "payload": event["data"]
        })
      }
    }
  },

  mutations: {
    newConnection(state, connect) {
      state.wsConnections[connect["groupID"]] = connect["ws"]
      state[connect["groupID"]] = ""
    },
    getNewMessage(state, payload) {
      state[payload["groupID"]] = payload["payload"]
    }
  },

  state: {
    wsConnections: {},
  },
})