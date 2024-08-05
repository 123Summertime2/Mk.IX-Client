import axios from 'axios'
import Dexie from 'dexie'

import { dbCRUD } from '../assets/dbCRUD.js'
import { queryInfo } from '../assets/queryDB.js'

import { createStore } from 'vuex'


async function favoriteDB() {
  const db = new Dexie('Favorite')
  db.version(1).stores({
    Image: "&time",
  })
  return new dbCRUD(db)
}


export default createStore({
  actions: {
    async wsConnect(context, info) {
      const adress = localStorage.getItem('adress')
      const token = localStorage.getItem('token')
      const URL = `ws://${adress}/ws/ws?userID=${info.uuid}&groupID=${info.groupID}`

      const ws = new WebSocket(URL, [token])
      context.commit('newConnection', {
        groupID: info.groupID,
        ws: ws,
      })

      // 获取群验证，仅作用于群主和管理员
      ws.onopen = async function () {
        if (!info.admin) { return }

        const URL = `http://${localStorage.getItem('adress')}/v1/group/${info.groupID}/verify/request`
        axios.get(URL, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => {
          // 结果会通过wsSys发送 sysMsgGetter.vue将对其作处理
        }).catch(err => {
          console.log("获取入群申请时失败", err)
        })
      }

      // 接收群消息
      ws.onmessage = async function (event) {
        const data = JSON.parse(event.data)
        const fullData = await queryInfo("Account", data.senderKey, data.senderID)
        context.commit('getNewMessage', {
          groupID: data.group,
          payload: {
            time: data.time,
            type: data.type,
            group: data.group,
            uuid: fullData.uuid,
            userName: fullData.userName,
            avatar: fullData.avatar,
            payload: data.payload
          }
        })
      }
    },

    async sysConnection(context, info) {
      const adress = localStorage.getItem('adress')
      const token = localStorage.getItem('token')
      const URL = `ws://${adress}/ws/systemWS?userID=${info.uuid}`
      const ws = new WebSocket(URL, [token])

      // 获取好友申请
      ws.onopen = async function () {
        const URL = `http://${localStorage.getItem('adress')}/v1/user/${info.uuid}/verify/request`
        axios.get(URL, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => {
          // 结果会通过wsSys发送 sysMsgGetter.vue将对其作处理
        }).catch(err => {
          console.log("获取好友申请时失败", err)
        })
      }

      // 接收系统消息
      ws.onmessage = async function (event) {
        const data = JSON.parse(event.data)
        context.commit('getNewSysMessage', data)
      }

      context.commit('sysConnection', { "ws": ws })
    },

    loginAs(context, info) {
      context.commit('loginAs', info)
    },

    lastMessage(context, info) {
      context.commit('lastMessage', info)
    },

    updateGroupInfo(context, info) {
      context.commit('updateGroupInfo', info)
    },

    getNewAt(context, info) {
      context.commit('getNewAt', info)
    },

    getGroupAttention(context, info) {
      context.commit('getGroupAttention', info)
    }
  },

  mutations: {
    newConnection(state, connect) {
      state.wsConnections[connect.groupID] = connect.ws
      state[connect.groupID] = ""
    },

    sysConnection(state, ws) {
      state.sys = ws
    },

    getNewMessage(state, payload) {
      state[payload.groupID] = payload.payload
    },

    getNewSysMessage(state, payload) {
      state.sysMsg = payload
    },

    loginAs(state, info) {
      state.account = info.account
      state.userName = info.userName
    },

    lastMessage(state, info) {
      state["lastMessageOf" + info.group] = info.payload
    },

    updateGroupInfo(state, info) {
      state.groupList.push(info)
    },

    getNewAt(state, info) {
      state.currentAt = info
    },

    getGroupAttention(state, info) {
      state.groupAttentions.set(info.group, info.type)
    }
  },

  state: {
    account: "",
    userName: "",
    sysMsg: "",
    groupList: [],
    groupAttentions: new Map(),  // group: String -> type: String, 
    favoriteDB: await favoriteDB(),
    currentAt: {},  // element: {uuid: String, userName: String}
    wsConnections: {},  // element: {groupID: Websocket}
    // {group}: group新收到的消息
    // lastMessageOf{group}: group的最后一条消息
    // sys: 系统消息Websocket
  },
})