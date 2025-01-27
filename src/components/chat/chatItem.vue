<template>
  <div class="chatItemRoot" @scroll="onScroll" ref="messageView">
    <div>
      <message v-for="msg in sorted" :key="msg.time" ref='MessageList'
        :group="group"
        :type="type"
        :message="msg"
        :admins="admins"
        @deleteMsg="deleteMsg"
        @revokeMsg="revokeMsg"></message>
    </div>
    <div class="attentionButton" v-if="attentionVisible" @click="gotoAttention">
      <p>{{ attentionContent }}</p>
    </div>
  </div>
</template>

<script>
import forge from 'node-forge';
import Dexie from 'dexie'

import message from './message.vue'

import { dbCRUD } from '../../assets/js/dbCRUD.js'
import { queryInfo } from '../../assets/js/queryDB.js'

export default {
  props: {
    avatar: String,
    group: String,
    name: String,
    admins: Object,
    active: Boolean,
    available: Boolean,
    type: String,
    delete: Object,
  },

  data() {
    return {
      lock: false,  // 防止onScroll同一时间反复触发getHistory
      page: 0,
      step: 20,
      messageList: [],
      attentionVisible: false,
      attentionTarget: "",
      attentionContent: "",
    }
  },

  methods: {
    buildOrGetDB() {
      const db = new Dexie(this.$store.state.account + '-' + this.group + '-' + this.type)
      db.version(1).stores({
        History: "&time",
      })
      this.DB = new dbCRUD(db)
      this.$store.dispatch("buildGroupDB", {
        group: this.group,
        db: this.DB,
      })
    },

    async getHistory() {
      const history = await this.DB.queryRange('History', this.page * this.step, this.step, true)
      for (const msg of history) {
        const info = await queryInfo("Account", null, msg.uuid)
        const message = {
          time: msg.time,
          type: msg.type,
          uuid: msg.uuid,
          payload: msg.payload,
          avatar: info.avatar,
          username: info.username,
        }
        this.messageList.unshift(message)
      }
      this.lock = false
      this.page += 1
    },

    // 快滚动到顶时，获取更早的历史记录
    async onScroll() {
      const threshold = 50
      if (this.$refs.messageView.scrollTop <= threshold && !this.lock) {
        this.lock = true
        await this.getHistory()
      }
    },

    // 新增一条历史记录(本地)
    putHistory(message) {
      this.DB.add('History', message)
    },

    // 删除一条历史记录(本地)
    deleteMsg(time) {
      this.DB.delete("History", "time", time)
      const idx = this.messageList.findIndex(i => i.time === time)
      this.messageList.splice(idx, 1)
    },

    // 撤回一条消息
    revokeMsg(time) {
      this.$store.state.ws.send(JSON.stringify({
        type: 'revokeRequest',
        group: this.group,
        groupType: this.type,
        payload: {
          name: null,
          size: null,
          content: time,
        },
      }))
    },

    // 其他用户撤回了一条消息，修改历史记录
    async newRevokeHandler(message) {
      const target = message.payload.meta.var.time
      const revokeMsg = await this.DB.query('History', { time: target })
      if (revokeMsg) {
        const storage = {
          time: target,
          uuid: revokeMsg.uuid,
          type: "revoke",
          payload: {
            content: message.payload.content,
            meta: JSON.parse(JSON.stringify(message.payload.meta)),
          }
        }
        await this.DB.update('History', storage)

        message.time = target
        const idx = this.messageList.findIndex(i => i.time === target)
        if (idx != -1) { this.messageList[idx] = message }
        return true
      }
      return false
    },

    // 其他用户@你
    newAttentionHandler(message) {
      const account = this.$store.state.account
      const atList = message.payload.meta ? message.payload.meta.at : []
      if (atList && atList.includes(account)) {
        this.attentionVisible = true,
        this.attentionTarget = message.time
        this.attentionContent = "有人@你"
        this.$store.dispatch("getGroupAttention", {
          type: "at",
          group: this.group,
        })
      }
    },

    getCryptoKey() {
      const keys = JSON.parse(localStorage.getItem(`${this.$store.state.account}-cryptoKey`) || "{}") 
      return keys[this.group] || ""
    },

    decryptHandler(message) {
      if (!message.payload.meta.encrypt || !['text', 'image'].includes(message.type)) { return }
      const key = this.getCryptoKey()

      try {
        const decipher = forge.cipher.createDecipher('AES-CBC', key)
        decipher.start({ iv: forge.util.hexToBytes(message.payload.meta.iv) })
        decipher.update(forge.util.createBuffer(forge.util.decode64(message.payload.content)))
        const finish = decipher.finish()
        if (finish) {
          message.payload.content = forge.util.decodeUtf8(decipher.output.data)
          message.payload.meta.encrypt = false
          return
        }
      } catch (error) {
        console.log("Decrypt Error")
      }
      message.type = "text"
      message.payload.content = "加密信息"
    },

    // 点击"有人@你"后, 滚动到该消息处
    async gotoAttention() {
      this.attentionVisible = false
      const ref = this.$refs.MessageList
      const idx = ref.findIndex(i => i.message.time === this.attentionTarget)

      if (idx == -1) { return }

      if (this.attentionTarget === this.messageList[0].time) {
        // 如果滚动到的是messageList的第一条消息，onScroll会触发getHistory导致滚动不准确
        // 所以在滚动前先getHistory一次
        await this.getHistory() 
      }

      const element = ref[idx].$el
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      element.classList.add('flash')  // 闪烁动画
      setTimeout(() => {
        element.classList.remove('flash')
      }, 2000)
    },

    async newMessageHandler(message) {
      if (!message) { return }
      if (message.type === 'revoke') {
        if (await this.newRevokeHandler(message)) { return }
      }

      this.newAttentionHandler(message)
      this.decryptHandler(message)

      const atBottom = this.$refs.messageView.scrollTop + this.$refs.messageView.clientHeight >= this.$refs.messageView.scrollHeight
      const storage = {
        time: message.time,
        type: message.type,
        uuid: message.uuid,
        payload: JSON.parse(JSON.stringify(message.payload))
      }

      this.messageList.push(message)
      this.putHistory(storage)

      // 如果是自己发的或已经滚动到底，加入新消息后自动滚动到底
      if (message.uuid === this.$store.state.account || atBottom) {
        this.$nextTick(() => {
          requestAnimationFrame(() => {
            this.$refs.messageView.scrollTop = this.$refs.messageView.scrollHeight
          })
        })
      }
    }

  },

  computed: {
    sorted() {
      return this.messageList.slice().sort((a, b) => a.time > b.time ? 1 : -1);
    },

    newMessage() {
      return this.$store.state[this.group]
    },

    refresh() {
      return this.$store.state.refresh
    }
  },

  watch: {
    // 从Vuex中获取该群最新消息，加入messageList并存储
    newMessage: {
      async handler(message) {
        this.newMessageHandler(message)
      }
    },

    // 用户更新了头像或昵称，更新所有信息的头像或昵称
    refresh: {
      async handler(newVal) {
        if (newVal) {
          for (let i = 0; i < this.messageList.length; i++) {
            if (this.messageList[i].uuid == newVal.uuid) {
              this.messageList[i].username = newVal.username
              this.messageList[i].avatar = newVal.avatar
            }
          }
        }
      }
    },

    // 更新本群最后一条消息，groupItem.vue要用
    messageList: {
      deep: true,
      handler() {
        this.$store.dispatch('lastMessage', {
          group: this.group,
          payload: this.messageList.slice(-1)[0]
        })
      }
    },

    // 切换群后，自动滚动到最底部
    active: {
      handler() {
        this.$nextTick(() => {
          requestAnimationFrame(() => {
            this.$refs.messageView.scrollTop = this.$refs.messageView.scrollHeight
          })
        })
      }
    },

    // 清空消息
    delete: {
      handler(newVal) {
        if (newVal.group === this.group) {
          this.messageList = []
        }
      }
    },

  },

  async mounted() {
    this.buildOrGetDB()
    await this.getHistory()

    // 没有历史记录，但vuex可能有消息，比这个组件挂载的早，所以手动获取一次（比如新入的群）
    if (this.messageList.length == 0) {
      this.newMessageHandler(this.newMessage)
    }
  },

  components: {
    message
  }
}
</script>

<style>
.chatItemRoot {
  overflow: scroll;
}

.chatItemRoot::-webkit-scrollbar {
  display: none;
}

.attentionButton {
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 96px;
  right: 0;
  height: 3rem;
  padding: 0.5rem 1.5rem;
  border-top-left-radius: 1.5rem;
  border-bottom-left-radius: 1.5rem;
  background: var(--chatItem-attentionButton-bgcolor);
  cursor: pointer;
}

.attentionButton p {
  font-size: 1.2rem;
  color: var(--chatItem-attentionButton-textcolor);
}

@keyframes flash {
  0% {
    background: transparent;
  }

  50% {
    background: var(--chatItem-flash-bgcolor);
  }

  100% {
    background: transparent;
  }
}

.flash {
  animation: flash 0.6s ease-in-out 2;
}
</style>