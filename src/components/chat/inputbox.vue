<template>
  <div class="inputBoxRoot">
    <div class="bar">
      <div class="barItem" title="上传">
        <label for="fileUpload">
          <FolderAdd class="icon" />
        </label>
        <input type="file" id="fileUpload" @change="fileUpload">
      </div>
      <div class="barItem" title="图片" @click="favoriteVisible = !favoriteVisible">
        <Picture class="icon"></Picture>
      </div>
      <div class="barItem" title="语音">
        <el-popover
          :visible="recorder.recording"
          placement="top"
          :width="200"
          trigger="click"
          :hide-after="40"
          :content="`录音中, 再次点击结束录音\n已录制 ${recorder.time}s`">
          <template #reference>
            <Microphone class="icon" @click="audioRecorder"></Microphone>
          </template>
        </el-popover>
      </div>
      <div :class="['barItem', (input || atList.size) ? '' : 'barItemDisabled']" title="发送(Shift+Enter)" @click="sendingText()">
        <Promotion class='icon' />
      </div>
    </div>

    <div class="main">
      <atBar class="atBar" 
      :atList="atList" 
      :style="{ display: favoriteVisible ? 'none' : 'block' }"
      @deleteAt="deleteAt" ></atBar>
      <textarea v-model=input 
        :disabled="!available" 
        :style="{ color: favoriteVisible ? 'transparent' : '' }"
        v-on:paste="pasteImg" 
        @keydown="onKeyDown"></textarea>
      <favorite class="favorite" v-if="favoriteVisible" @sendFavoriteImg="sendFavoriteImg"></favorite>
    </div>

    <!-- 确认遮罩层 -->
    <el-dialog v-model="visible" title="发送确认" width="640px" :show-close="false" :destroy-on-close="true">
      <img class="previewImg" :src="payload.content" v-if="payload.type === 'image'" />
      <audioMsg class="previewAudio" v-else-if="payload.type === 'audio'" :group="group" :message="audioMessagePreview"></audioMsg>
      <p class="previewFile" v-else>{{ payload.name.split(".").slice(-1)[0] + "文件" }}</p>
      <template #footer>
        <span class="footer">
          <div class="fileInfo">
            <div class="msgName" :title="payload.name">{{ payload.name }}</div>
            <div class="msgSize" :title="fileSize(payload.size)">{{ fileSize(payload.size) }}</div>
          </div>
          <div class="buttons">
            <el-button plain type="primary" @click="confirmedSending">确认</el-button>
            <el-button plain type="info" @click="canceledSending">取消</el-button>
          </div>
        </span>
      </template>
    </el-dialog>

    <upload 
    :title="payload.name" 
    :speed="uploadSpeed"
    :progress="uploadProgress"
    :show="showUploadBox"
    :failed="uploadFailed"></upload>

  </div>
</template>

<script>
import forge from 'node-forge';
import axios from 'axios'

import atBar from './atBar.vue'
import favorite from './favorite.vue'
import upload from './upload.vue'
import audioMsg from './messageType/audioMsg.vue'

export default {
  props: {
    group: String,
    type: String,
    available: Boolean,
  },

  data() {
    return {
      input: "",
      lastInput: "",
      payload: {
        type: "text",
        size: null,
        name: null,
        content: null,
      },
      recorder: {
        time: 0,
        timer: null,
        recording: false,
      },

      uploadSpeed: "",
      uploadProgress: 0,
      showUploadBox: false,
      uploadFailed: false,
      uploading: false,

      visible: false,
      favoriteVisible: false,
      atList: new Set(),  // 存储@其他人的JSON字符串，包含属性uuid, username
    }
  },

  methods: {
    getCryptoKey() {
      const keys = JSON.parse(localStorage.getItem(`${this.$store.state.account}-cryptoKey`) || "{}") 
      return keys[this.group] || ""
    },

    encrypt(s) {
      const key = this.getCryptoKey()
      if (!key) {
        return {
          content: s,
          encrypted: false,
          iv: null,
        }
      }
      const iv = forge.random.getBytesSync(16)
      const cipher = forge.cipher.createCipher('AES-CBC', key)
      cipher.start({ iv: iv })
      cipher.update(forge.util.createBuffer(s))
      cipher.finish()
      const encryptedText = forge.util.encode64(cipher.output.getBytes())      
      return {
        content: encryptedText,
        encrypted: true,
        iv: forge.util.bytesToHex(iv),
      }
    },

    // 发送text类型消息
    sendingText() {
      if (!this.input && !this.atList.size) { return }

      const { content, encrypted, iv } = this.encrypt(this.input)
      this.$store.state.ws.send(JSON.stringify({
        type: "text",
        group: this.group,
        groupType: this.type,
        payload: {
          content: content,
          meta: {
            at: Array.from(this.atList).map(i => JSON.parse(i).uuid),
            encrypt: encrypted,
            iv: iv,
          }
        }
      }))
      this.lastInput = this.input
      this.input = ""
      this.atList = new Set()
    },

    // 发送图片类型消息，以base64的形式
    sendingImage() {
      if (!this.payload.content) { return }
      const { content, encrypted, iv } = this.encrypt(this.payload.content)
      this.$store.state.ws.send(JSON.stringify({
        type: this.payload.type,
        group: this.group,
        groupType: this.type,
        payload: {
          content: content,
          meta: {
            at: [],
            encrypt: encrypted,
            iv: iv,
          }
        }
      }))
      this.payload.content = ""
    },

    // 发送文件类型消息
    sendingFile() {
      if (this.uploading) {
        ElMessage({
          message: "文件正在上传中，请等待当前文件上传完成。",
          duration: 6000,
          type: "error",
        })
      }

      const FD = new FormData()
      FD.append('file', this.payload.content)
      FD.append('fileType', this.payload.type)
      FD.append('groupType', this.type)

      const URL = this.type === 'group' 
        ? `${localStorage.getItem('adress')}/v1/group/${this.group}/upload`
        : `${localStorage.getItem('adress')}/v1/user/${this.group}/upload`

      let lastLoaded = 0
      let lastTimestamp = Date.now()
      this.uploadProgress = 0
      this.uploadFailed = false
      this.uploading = true
      if (this.payload.type === 'file') { this.showUploadBox = true }
      
      axios.post(URL, FD, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        onUploadProgress: event => {
          const currentLoaded = event.loaded
          const total = event.total
          this.uploadProgress = Math.round((currentLoaded * 100) / total)

          const currentTime = Date.now()
          const timeDelta = (currentTime - lastTimestamp) / 1000
          const bytesDelta = currentLoaded - lastLoaded
          this.uploadSpeed = this.fileSize(bytesDelta / timeDelta)

          lastLoaded = currentLoaded
          lastTimestamp = currentTime
        }
      }).then(() => {
        this.uploading = false
        setTimeout(() => {
          this.showUploadBox = false
        }, 4000)
      }).catch(err => {
        this.uploadFailed = true
      })
    },

    // shift + enter也可以发送
    onKeyDown(event) {
      if (event.shiftKey && event.key === 'Enter') {
        event.preventDefault()
        this.sendingText()
      }

      if (event.key === "ArrowUp") {
        const temp = this.input
        this.input = this.lastInput
        this.lastInput = temp
      }
    },

    // 用户选择了要上传的文件，如果是图片，改为webp再发送
    fileUpload(event) {
      const file = event.target.files[0]
      if (file) {
        this.payload.name = file.name
        const reader = new FileReader()

        reader.onload = () => {
          this.payload.size = file.size
          this.payload.type = file.type.toLowerCase().split('/')[0] === "image" ? "image" : "file"

          if (this.payload.type === "image") {
            this.toWebpBase64(reader.result)
          } else {
            this.payload.content = file
            this.beforeSending()
          }
          event.target.value = ""
        }
        reader.readAsDataURL(file)
      }
    },

    // 图片改为webp，gif或已经是webp的跳过
    toWebpBase64(base64) {
      if (base64.includes('data:image/gif') || base64.includes('data:image/webp')) {  
        this.payload.content = base64
        this.beforeSending()
        return
      }

      let img = new Image()
      img.src = base64

      img.onload = () => {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0)

        canvas.toBlob((webpBlob) => {
          this.payload.size = webpBlob.size

          let readerWebp = new FileReader()
          readerWebp.onload = (event) => {
            this.payload.content = event.target.result
            this.beforeSending()
          }
          readerWebp.readAsDataURL(webpBlob)
        }, 'image/webp')
      }
    },

    // 粘贴图片到输入框，尝试改为webp再发送
    pasteImg(event) {
      const items = (event.clipboardData || event.originalEvent.clipboardData).items;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          this.payload.name = 'Image'
          this.payload.type = 'image'

          let reader = new FileReader()
          reader.onload = (event) => {
            this.toWebpBase64(event.target.result)
          }

          let blob = items[i].getAsFile()
          reader.readAsDataURL(blob)
        }
      }
    },

    // 录音时，有最大时长限制
    async audioRecorder() {
      if (!this.recorder.recorder) {
        if (!navigator.mediaDevices) {
          ElMessage({
            message: "语音仅在HTTPS下可用",
            duration: 6000,
            type: "error",
          })
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        this.recorder.recorder = new MediaRecorder(stream)
      }

      this.recorder.recorder.ondataavailable = event => {
        this.payload.content.push(event.data)
      }

      this.recorder.recorder.onstop = () => {
        this.payload.name = 'record.mp3'
        const blob = new File(this.payload.content, this.payload.name, { type: 'audio/mp3' })
        this.payload.size = blob.size
        this.payload.content = blob
        clearInterval(this.recorder.timer)
        this.beforeSending()
        this.recorder.recorder = null
      }

      if (this.recorder.recording) {
        this.recorder.recording = false
        this.recorder.recorder.stop()
        return
      }

      this.payload.type = 'audio'
      this.payload.content = []
      this.recorder.time = 0
      this.recorder.recording = true
      this.recorder.recorder.start()

      this.recorder.timer = setInterval(() => {
        if (this.recorder.time === 50 - 1 && this.recorder.recording) {
          this.recorder.recording = false
          this.recorder.recorder.stop()
        }
        this.recorder.time += 1
      }, 1000)
    },

    fileSize(size) {
      const mb = 1 << 20
      const kb = 1 << 10
      if (size >= mb) {
        return (size / mb).toFixed(2) + "MB"
      }
      if (size >= kb) {
        return (size / kb).toFixed(2) + "KB"
      }
      return size + "B"
    },

    beforeSending() {
      this.visible = true
    },

    confirmedSending() {
      this.visible = false
      const callFunction = {
        text: this.sendingText,
        image: this.sendingImage,
        audio: this.sendingFile,
        file: this.sendingFile,
      }
      callFunction[this.payload.type]()
    },

    canceledSending() {
      this.visible = false
    },

    // 发送收藏的表情包，尝试改为webp后发送
    sendFavoriteImg(img) {
      this.favoriteVisible = false
      this.payload.type = 'image'
      this.payload.content = img

      // webp的base64中包含'UklGR'
      const isWebp = img.substring(0, 30).indexOf('UklGR') >= 0
      if (!isWebp) {
        this.toWebpBase64(img)
      }

      this.confirmedSending()
    },

    deleteAt(target) {
      this.atList.delete(target)
    },

  },

  computed: {
    // 语音消息发送前预览
    audioMessagePreview() {
      return {
        payload: {
          meta: {
            length: this.recorder.time,
            blob: this.payload.content
          }
        }
      }
    },
    
    getNewAt() {
      return this.$store.state.currentAt
    }
  },

  watch: {
    getNewAt: {
      handler(newVal) {
        if (newVal) {
          this.atList.add(JSON.stringify(newVal))
        }
      }
    },

    // 切换群时，清空at列表，不清空输入框
    group: {
      handler() {
        this.atList = new Set()
      }
    },
  },

  components: {
    atBar,
    favorite,
    upload,
    audioMsg,
  },

}
</script>

<style scoped>
.inputBoxRoot {
  background: var(--inputBox-inputBoxRoot-bgcolor);
}

/* bar */
.bar {
  display: flex;
  align-items: center;
  width: 100%;
  height: 3rem;
  padding: 0 1.5rem;
  background: var(--inputBox-bar-bgcolor);
}

input[type="file"] {
  display: none;
}

.barItem {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2rem;
  cursor: pointer;
  background: transparent;
  margin-right: 24px;
  color: var(--inputBox-barItem-svgcolor);
}

.barItem label {
  cursor: pointer;
}

.barItem:hover {
  color: var(--inputBox-barItem-hover-svgcolor);
}

.barItemDisabled {
  color: var(--inputBox-barItemDisabled-svgcolor) !important;
  cursor: not-allowed;
}

.icon {
  display: block;
  width: 100%;
  height: 100%;
}

/* main */

.main {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100% - 48px);
}

.atBar {
  width: 100%;
}

textarea {
  display: block;
  width: 100%;
  height: 100%;
  padding: 8px 16px 16px 16px;
  font-size: 1.2rem;
  resize: none;
  border: none;
  outline: none;
  background: var(--inputBox-textarea-bgcolor);
  color: var(--inputBox-textarea-textcolor);
}

textarea::-webkit-scrollbar {
  display: none;
}

.favorite {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

/* check layer */
.previewImg {
  display: block;
  max-width: 100%;
  max-height: 40vh;
  margin: 0 auto;
}

.previewAudio {
  display: inline-flex;
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
}

.previewFile {
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 auto;
  color: var(--inputBox-perviewFile-textcolor);
}

.footer,
.imgInfo,
.buttons {
  display: flex;
  justify-content: space-between;
  line-height: 32px;
}

.footer {
  max-width: 100%;
}

.fileInfo {
  display: flex;
  justify-content: left;
  flex-grow: 1;
  margin-right: 16px;
  text-align: left;
  overflow: hidden;
}

.msgName {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--inputBox-msgName-textcolor);
}

.msgSize {
  flex-grow: 1;
  margin-left: 16px;
  color: var(--inputBox-msgSize-textcolor);
}

.buttons button:nth-child(2) {
  margin-left: 16px;
}

:deep(.el-dialog__body){ 
  display: flex;
  justify-content: center;
}
</style>